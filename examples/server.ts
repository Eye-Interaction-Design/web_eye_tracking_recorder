import indexHTML from "./browser-example.html";

const server = Bun.serve({
	port: 3000,
	fetch(req) {
		const url = new URL(req.url);
		
		// HTMLファイルを提供
		if (url.pathname === "/" || url.pathname === "/index.html") {
			return new Response(indexHTML.toString(), {
				headers: { "Content-Type": "text/html" },
			});
		}
		
		// ライブラリファイルを提供
		if (url.pathname === "/browser-eye-tracking.js") {
			const file = Bun.file("../dist/index.js");
			return new Response(file, {
				headers: { 
					"Content-Type": "application/javascript",
					"Access-Control-Allow-Origin": "*"
				},
			});
		}
		
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log("📁 Examples available:");
console.log("  - Basic usage: bun run basic");
console.log("  - Advanced usage: bun run advanced");
console.log("  - Browser demo: http://localhost:3000");