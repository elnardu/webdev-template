#!/usr/bin/env node

const esbuild = require("esbuild");
const { createServer, request } = require("http");

const isRelease = process.argv[2] === "--release";

if (isRelease) {
  console.log("Building for release...");
}

// Where to proxy requests staring with `/api`
const API_PORT = 8080;

esbuild
  .build({
    bundle: true,
    sourcemap: false ? isRelease : true,
    inject: ["src/react-shim.ts"],
    jsxFactory: "h",
    jsxFragment: "Fragment",
    entryPoints: ["src/index.tsx"],
    banner: undefined
      ? isRelease
      : {
          js: '(() => new EventSource("/esbuild").onmessage = () => location.reload())();\n',
        },
    splitting: true,
    format: "esm",
    outdir: "dist/",
    ...({}
      ? isRelease
      : {
          watch: {
            onRebuild: onRebuild,
          },
        }),
  })
  .catch(() => process.exit(1));

let clients = [];
function onRebuild(error, _result) {
  // Force clients to reload
  clients.forEach((res) => res.write("data: update\n\n"));
  clients = [];
  console.log(error ? error : "Updated");
}

if (isRelease === false) {
  esbuild.serve({ servedir: "./dist" }, {}).then(() => {
    createServer((req, res) => {
      const { url, method, headers } = req;

      if (url === "/esbuild") {
        clients.push(
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          })
        );
      } else if (url.startsWith("/api")) {
        // api proxy
        req.pipe(
          request(
            {
              hostname: "localhost",
              port: API_PORT,
              path: url,
              method,
              headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res, { end: true });
            }
          ),
          { end: true }
        );
      } else if (url.startsWith("/dist")) {
        // esbuild dist proxy
        req.pipe(
          request(
            {
              hostname: "0.0.0.0",
              port: 8000,
              path: url.slice("/dist".length),
              method,
              headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res, { end: true });
            }
          ),
          { end: true }
        );
      } else {
        // esbuild spa proxy
        req.pipe(
          request(
            {
              hostname: "0.0.0.0",
              port: 8000,
              path: "/index.html",
              method,
              headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode, proxyRes.headers);
              proxyRes.pipe(res, { end: true });
            }
          ),
          { end: true }
        );
      }
    }).listen(3000, () => console.log("Listening on http://localhost:3000"));
  });
}
