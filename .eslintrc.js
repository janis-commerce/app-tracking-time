module.exports = {
	env: {
		es6: true,
		jest: true,
		node: true,
	},
	extends: ['airbnb-base', 'prettier'],
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
		__DEV__: 'readonly',
		fetch: false,
	},
	parser: '@babel/eslint-parser',
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module',
		requireConfigFile: false,
	},
	plugins: ['prettier'],
	rules: {
		'prettier/prettier': 'error',
		'import/prefer-default-export': 'off',
		// TODO: volver a 'error' cuando se mergee el PR #14 (APPSRN-535), que agrega
		// react-native-fs a peerDependencies. Ver el comentario en el PR:
		// lib/database.js lo importa en runtime (RNFS.DocumentDirectoryPath en el
		// constructor) pero está declarado solo en devDependencies.
		'import/no-extraneous-dependencies': [
			'warn',
			{
				devDependencies: [
					'**/__test__/**',
					'**/__mocks__/**',
					'**/setupTest/**',
					'*.config.js',
					'*.setup.js',
				],
				peerDependencies: true,
			},
		],
		'no-param-reassign': 'off',
		'no-console': 'off',
		'no-underscore-dangle': ['error', {allowAfterThis: true}],
		// --- Deuda temporal ---------------------------------------------------
		// Las 2 reglas de abajo están en 'error' en app-tracking-shift; se apagan
		// acá solo para que la config entre sin arrastrar refactors que choquen
		// con el PR #14 (APPSRN-535), abierto sobre los mismos archivos.
		//
		// TODO: reactivar `consistent-return` normalizando los `return
		// Promise.reject(error)` a `throw error` (equivalentes dentro de un async,
		// pero `throw` no depende del async para avisar). Quedan 15 en el paquete:
		// 10 en lib/event-tracker.js (reescrito por el #14) y 5 en lib/database.js.
		// Pendiente además el `return null` de database.delete, cuyo valor hoy
		// consume removeFinishById — método que el #14 elimina.
		'consistent-return': 'off',
		// TODO: reactivar moviendo el `let validPreviousTypes` de
		// utils/validations.js fuera del `case` (el #14 no lo corrige).
		'no-case-declarations': 'off',
		'import/no-cycle': [
			'error',
			{
				maxDepth: 2,
				ignoreExternal: true,
			},
		],
		// Reglas para permitir funciones de flecha
		'func-style': 'off',
		'prefer-arrow-callback': 'off',
		'arrow-body-style': 'off',
		'prefer-const': 'error',
		'no-var': 'error',
		// Desactivar validaciones de class-methods-use-this
		'class-methods-use-this': 'off',
	},
	settings: {
		'import/resolver': {
			node: {},
		},
	},
};
