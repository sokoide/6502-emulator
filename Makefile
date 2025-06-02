.PHONY: build clean install

dev:
	@echo "Starting development server..."
	npm run dev

build:
	@echo "Building the project..."
	npm run build

install: build
	@echo "Installing..."
	rm -rf docs/*
	cp -r dist/* docs/

clean:
	@echo "Cleaning up..."
	rm -rf dist
	rm -rf docs/*
	rm -rf node_modules
	npm cache clean --force
	@echo "Clean complete."