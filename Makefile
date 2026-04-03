.PHONY: install test test-unit test-integration benchmark benchmark-full benchmark-visa serve demo lint

install:
	pip install -e .[test]
	python scripts/download_mvtec.py
	python scripts/download_visa.py

test:
	pytest tests/ -v --cov=parakh_ai --cov-report=term-missing

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

benchmark:
	python scripts/run_benchmark.py --categories leather bottle tile --n-calibration 10

benchmark-full:
	python scripts/run_benchmark.py --all-categories --n-calibration 10

benchmark-visa:
	python scripts/run_benchmark.py --dataset visa --categories capsules cashew --n-calibration 10

serve:
	uvicorn parakh_ai.api.main:app --host 0.0.0.0 --port 8000 --reload

demo:
	python scripts/demo_webcam.py

lint:
	ruff check parakh_ai/ tests/
	mypy parakh_ai/ --ignore-missing-imports
