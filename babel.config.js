module.exports = {
	presets: [
		'@babel/preset-env',
		'@babel/preset-react'
	],
	ignore: [
		// Ignora los archivos en `node_modules` que no necesitan ser transformados.
		'**/node_modules/**'
	  ]
};