import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 🌐 GLOBAL STORE ---
let GLOBAL_API_URL = 'http://192.168.1.100:8000';

function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="brain" size={64} color="#06b6d4" style={{ marginBottom: 20 }} />
      <Text style={styles.title}>Parakh.AI</Text>
      <Text style={styles.subtitle}>The Next Evolution in Edge Intelligence</Text>
      <TouchableOpacity style={styles.buttonMain} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonTextLight}>Access Node (Login)</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState(GLOBAL_API_URL);

  const simulateLogin = () => {
    GLOBAL_API_URL = ip; 
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Dashboard');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Access Node</Text>
        <Text style={styles.subtitle}>Secure connection to manufacturing intelligence.</Text>

        <View style={styles.inputGroup}>
           <Text style={styles.label}>Edge API URL (FastAPI)</Text>
           <TextInput 
             style={styles.input} 
             value={ip}
             onChangeText={setIp}
             placeholder="http://192.168.x.x:8000" 
             placeholderTextColor="#52525b" 
             autoCapitalize="none" 
           />
        </View>

        <View style={styles.inputGroup}>
           <Text style={styles.label}>Employee Endpoint</Text>
           <TextInput style={styles.input} placeholder="systems@parakh.ai" placeholderTextColor="#52525b" autoCapitalize="none" />
        </View>

        <TouchableOpacity style={styles.buttonMain} disabled={loading} onPress={simulateLogin}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonTextLight}>Initiate Handshake</Text>}
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

function ScannerTab() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('resnet50'); // Added Model Selection

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();       
    if (!perm.granted) return Alert.alert('Permission required', 'We need access to your gallery!');

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission required', 'We need access to your camera!');

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const runDiagnostics = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('session_id', selectedModel); // Used the selected model here
      formData.append('generate_heatmap', 'true');

      const response = await fetch(`${GLOBAL_API_URL}/api/v1/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (!response.ok) throw new Error('Diagnostics failed. Ensure Edge API is reachable.');
      const data = await response.json();
      setResult(data);
    } catch (e: any) {
      Alert.alert('Diagnostics Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setImageUri(null);
    setResult(null);
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.titleSmall}>Edge Scanner</Text>
      <Text style={styles.subtitle}>Run latency-free visual inspection nodes.</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Select AI Model</Text>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: 12, marginBottom: 20 }}>
          <Picker
            selectedValue={selectedModel}
            onValueChange={(itemValue) => setSelectedModel(itemValue)}
            style={{ color: '#fff' }}
            dropdownIconColor="#06b6d4"
          >
            <Picker.Item label="ResNet-50 Node" value="resnet50" />
            <Picker.Item label="Vision Transformer (ViT)" value="vit" />
            <Picker.Item label="EfficientNet B0" value="efficientnet" />
          </Picker>
        </View>

        {!imageUri ? (
          <View>
            <View style={{flexDirection: 'row', gap: 10, width: '100%'}}>
                <TouchableOpacity style={[styles.buttonOutline, {flex: 1, borderColor:'#06b6d4'}]} onPress={takePhoto}>
                    <Text style={{color:'#06b6d4', textAlign:'center', fontWeight:'bold'}}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.buttonOutline, {flex: 1, borderColor:'#06b6d4'}]} onPress={pickImage}>
                    <Text style={{color:'#06b6d4', textAlign:'center', fontWeight:'bold'}}>Gallery</Text>
                </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: 250, borderRadius: 16, marginBottom: 20 }} />
            
            {result ? (
              <View style={{ backgroundColor: result.is_defective ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: 20, borderRadius: 16, borderColor: result.is_defective ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)', borderWidth: 1, marginBottom: 20 }}>
                <Text style={{ color: result.is_defective ? '#ef4444' : '#22c55e', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
                  {result.is_defective ? 'DEFECT DETECTED' : 'CLEAR - NO DEFECT'}
                </Text>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Z-Score / Anomaly: {result.anomaly_score?.toFixed(4)}</Text>
                {result.heatmap_b64 && (
                   <View style={{ marginTop: 15 }}>
                     <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 5, fontSize: 10 }}>ACTIVATION HEATMAP</Text>
                     <Image source={{ uri: 'data:image/jpeg;base64,' + result.heatmap_b64 }} style={{ width: '100%', height: 150, borderRadius: 8, opacity: 0.8 }} />
                   </View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.buttonMain} onPress={runDiagnostics} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonTextLight}>Run AI Inspection</Text>}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={resetScanner}>
              <Text style={{ color: '#a1a1aa' }}>Scan Another Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<number[]>([10, 20, 30, 40, 50, 60, 40, 30, 20, 30]);
  useEffect(() => {
    const i = setInterval(() => {
      setData(prev => {
        const next = [...prev, Math.floor(Math.random()*100)];
        if(next.length > 20) next.shift();
        return next;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);
  
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.titleSmall}>Live Telemetry</Text>
      <Text style={styles.subtitle}>Real-time cluster analytics & diagnostic streams.</Text>
      
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SYSTEM SECURE</Text>
          <Text style={[styles.statValue, {color: '#22c55e'}]}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LATENCY LINK</Text>
          <Text style={styles.statValue}>12ms</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.statLabel}>LIVE INFERENCE STREAM</Text>
        <View style={styles.chartArea}>
           {data.map((h, idx) => (
              <View key={idx} style={[styles.bar, { height: h }]} />
           ))}
        </View>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
          <Text style={{color: '#52525b', fontSize: 10}}>T-20s</Text>
          <Text style={{color: '#52525b', fontSize: 10}}>Edge Node {Math.floor(Math.random() * 10) + 1}</Text>
        </View>
      </View>

      <View style={{height:20}} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Integration SDK</Text>
        <Text style={styles.subtitle}>Download C++ / Python edge agents to deploy models directly to manufacturing hardware.</Text>
        <TouchableOpacity style={[styles.buttonOutline, {borderColor: '#06b6d4'}]}><Text style={{color:'#06b6d4', textAlign:'center', fontWeight:'bold'}}>View Documentation</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function PricingTab() {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.titleSmall}>Plans & Subscriptions</Text>
      <Text style={styles.subtitle}>Manage your organization's edge computing scale.</Text>
      <View style={styles.card}>
        <Text style={styles.statLabel}>EDGE BASIC</Text>
        <Text style={styles.title}><Text style={{fontSize: 20}}>/mo</Text></Text>
        <Text style={styles.subtitle}>100k inferences / month</Text>
        <TouchableOpacity style={styles.buttonMain}><Text style={styles.buttonTextLight}>Select Plan</Text></TouchableOpacity>
      </View>
      <View style={{height:20}} />
      <View style={styles.card}>
        <Text style={styles.statLabel}>ENTERPRISE CLUSTER</Text>
        <Text style={styles.title}><Text style={{fontSize: 20}}>/mo</Text></Text>
        <Text style={styles.subtitle}>Unlimited inferences + Dedicated Node architecture</Text>
        <TouchableOpacity style={styles.buttonMain}><Text style={styles.buttonTextLight}>Contact Sales</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DashboardTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help-circle';
          if (route.name === 'Scanner') iconName = 'line-scan';
          else if (route.name === 'Analytics') iconName = 'chart-timeline-variant';
          else if (route.name === 'Pricing') iconName = 'credit-card-outline';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#06b6d4',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#000', borderTopColor: '#222' },
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Scanner" component={ScannerTab} options={{ title: 'Inference' }} />
      <Tab.Screen name="Analytics" component={AnalyticsTab} options={{ title: 'Telemetry' }} />
      <Tab.Screen name="Pricing" component={PricingTab} options={{ title: 'Billing' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff', contentStyle: { backgroundColor: '#0a0a0a' } }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Secure Login' }} />
        <Stack.Screen name="Dashboard" component={DashboardTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 20 },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 30, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  title: { color: '#fff', fontSize: 48, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  titleSmall: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  cardTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { color: '#a1a1aa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1.5 },
  input: { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 16, borderRadius: 12, color: '#fff' },
  buttonMain: { backgroundColor: '#06b6d4', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', width: '100%' },
  buttonOutline: { borderColor: 'rgba(239,68,68,0.5)', borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  buttonTextLight: { color: '#000', fontWeight: 'bold', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  header: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  grid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, alignItems: 'center', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  statLabel: { color: '#06b6d4', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8, textAlign: 'center' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  chartArea: { height: 100, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  bar: { width: 10, backgroundColor: '#06b6d4', borderRadius: 2 }
});

