This project is a small interactive data story about albatrosses built as a static website using vanilla HTML/CSS/JavaScript. All visualizations run in the browser and rely on a few client-side libraries loaded from CDNs: 
- D3.js v7 for SVG drawing and interaction (anatomy hotspots, species view, threats matrix)
- Leaflet for the interactive map of daily flight distances
- PapaParse for parsing any CSV data

To run the project locally, clone the repository, open a terminal in the project root, and start a simple HTTP server (for example, python3 -m http.server 8000) so that JSON and image assets load correctly. 

Then visit http://localhost:8000/albatross-proto/index.html in your browser (or whatever path contains index.html). 

You can also use the following public site link: 
