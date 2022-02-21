NODE_BIN=./node_modules/.bin

build: test copy-assets
	./build.js --release

dev-build: copy-assets
	./build.js

copy-assets:
	rm -rf dist
	cp -r assets dist

test:
	$(NODE_BIN)/tsc
