const path = require("path");
module.exports = {
	entry: "./index.js",
	mode: "development",
	module: {
		rules: [
			{
				test: /(\.jsx|\.tsx?)$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css/i,
				use: ["style-loader", "css-loader"],
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".jsx", ".js"],
	},
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist"),
	},
};
