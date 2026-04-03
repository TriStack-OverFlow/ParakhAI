import logging
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from typing import Literal, List, Dict, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

_CACHE: Dict[str, "FeatureExtractor"] = {}

def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")

class FeatureExtractor:
    """
    Unified backbone interface.
    Supports WideResNet-50 and DINOv2.
    Frozen inference only.
    """

    def __new__(cls, backbone: Literal['wideresnet50', 'dinov2_vits14'] = 'wideresnet50', **kwargs):
        cache_key = f"{backbone}"
        if cache_key not in _CACHE:
            _CACHE[cache_key] = super(FeatureExtractor, cls).__new__(cls)
            _CACHE[cache_key]._initialized = False
        return _CACHE[cache_key]

    def __init__(
        self,
        backbone: Literal['wideresnet50', 'dinov2_vits14'] = 'wideresnet50',
        layers: List[int] = [2, 3],
        neighborhood_size: int = 3,
        device: Optional[torch.device] = None
    ):
        if getattr(self, "_initialized", False):
            return

        self.backbone_name = backbone
        self.layers = layers
        self.neighborhood_size = neighborhood_size
        self.device = device if device is not None else get_device()

        logger.info(f"Initializing FeatureExtractor with {self.backbone_name} on {self.device}")

        self.model = self._load_model()
        self.model.eval()
        for param in self.model.parameters():
            param.requires_grad = False

        self.features: Dict[str, torch.Tensor] = {}
        if self.backbone_name == 'wideresnet50':
            self._register_hooks()

        self._initialized = True

    def _load_model(self) -> nn.Module:
        if self.backbone_name == 'wideresnet50':
            model = models.wide_resnet50_2(weights=models.Wide_ResNet50_2_Weights.IMAGENET1K_V2)
            return model.to(self.device)
        elif self.backbone_name == 'dinov2_vits14':
            # Rely on torch hub
            model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
            return model.to(self.device)
        else:
            from parakh_ai.core.exceptions import ParakhAIError
            raise ParakhAIError(f"Unsupported backbone: {self.backbone_name}")

    def _register_hooks(self):
        def hook_fn(layer_name):
            def hook(module, input, output):
                self.features[layer_name] = output
            return hook

        target_layers = [f"layer{l}" for l in self.layers]
        for name, module in self.model.named_modules():
            if name in target_layers:
                module.register_forward_hook(hook_fn(name))

    def get_feature_dim(self) -> int:
        if self.backbone_name == 'wideresnet50':
            # WideResNet50 dims: layer2 is 512, layer3 is 1024
            dim_map = {1: 256, 2: 512, 3: 1024, 4: 2048}
            return sum([dim_map[l] for l in self.layers])
        elif self.backbone_name == 'dinov2_vits14':
            return 384
        return 0
        
    def get_patch_grid_size(self, image_size: int = 224) -> Tuple[int, int]:
        if self.backbone_name == 'wideresnet50':
            # Largest feature map dictates the grid. Commonly layer2 is H/8, layer3 is H/16.
            # We scale down to the size of the highest requested layer (smallest spatial dims). Wait, Patchcore aligns everything to the largest spatial map.
            # layer2 is 28x28 for 224 input.
            smallest_stride = 2 ** (min(self.layers) + 1)
            # layer1 stride 4, layer2 stride 8, layer3 stride 16
            return (image_size // smallest_stride, image_size // smallest_stride)
        elif self.backbone_name == 'dinov2_vits14':
            # Patch size is 14 for dinov2_vits14
            return (image_size // 14, image_size // 14)
        return (0, 0)

    @torch.no_grad()
    def extract(self, images: List[np.ndarray]) -> Dict[str, torch.Tensor]:
        pass # Only internal usage

    @torch.no_grad()
    def extract_patches(self, images: torch.Tensor) -> torch.Tensor:
        """
        Extract, aggregate, and flatten patches.
        images: Tensor of shape (B, C, H, W)
        Returns: Tensor of shape (N_patches_total, D) where N_patches_total = B * H_grid * W_grid
        """
        images = images.to(self.device)
        B = images.size(0)

        if self.backbone_name == 'wideresnet50':
            self.features.clear()
            _ = self.model(images)
            
            # Align features using neighborhood aggregation
            # layer2 is typically shape (B, 512, 28, 28)
            # layer3 is (B, 1024, 14, 14)
            # We upsample everything to the largest spatial resolution among chosen layers
            largest_spatial_size = None
            features_list = []
            
            target_layers = [f"layer{l}" for l in self.layers]
            for layer in target_layers:
                feat = self.features[layer]
                if largest_spatial_size is None:
                    largest_spatial_size = feat.shape[2:]
                
                # Neighborhood aggregation: Adaptive Average Pooling with 3x3 window around center
                # We achieve this using average pooling with stride=1 and padding
                pad = self.neighborhood_size // 2
                feat_agg = F.avg_pool2d(feat, kernel_size=self.neighborhood_size, stride=1, padding=pad)
                
                if feat_agg.shape[2:] != largest_spatial_size:
                    feat_agg = F.interpolate(feat_agg, size=largest_spatial_size, mode="bilinear", align_corners=False)
                
                features_list.append(feat_agg)
            
            # Concatenate along channel dimension
            concat_features = torch.cat(features_list, dim=1) # (B, D, H, W)
            
            # Flatten to (B * H * W, D)
            concat_features = concat_features.permute(0, 2, 3, 1).reshape(-1, concat_features.size(1))
            
            # L2 Normalize
            concat_features = F.normalize(concat_features, p=2, dim=1)
            return concat_features

        elif self.backbone_name == 'dinov2_vits14':
            # Extract patches directly
            features = self.model.forward_features(images)
            patch_tokens = features['x_norm_patchtokens'] # (B, N, D), N = H/14 * W/14
            patch_tokens = patch_tokens.view(-1, patch_tokens.size(-1))
            
            patch_tokens = F.normalize(patch_tokens, p=2, dim=1)
            return patch_tokens
        
        from parakh_ai.core.exceptions import ParakhAIError
        raise ParakhAIError("Unsupported backbone")
