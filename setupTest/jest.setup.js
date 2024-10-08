jest.mock('date-fns', () => {
	const lib = jest.requireActual('date-fns');

	return {
		...lib,
		isSameDay: jest.fn(lib.isSameDay), 
		differenceInMilliseconds: jest.fn(lib.differenceInMilliseconds)
	};
});


jest.mock('react-native', () => {
	return {
	  AppState: {
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		currentState: 'active',
	  },
	};
  });

jest.mock('react-native-fs', () => ({
	mkdir: jest.fn(),
	moveFile: jest.fn(),
	copyFile: jest.fn(),
	pathForBundle: jest.fn(),
	pathForGroup: jest.fn(),
	getFSInfo: jest.fn(),
	getAllExternalFilesDirs: jest.fn(),
	unlink: jest.fn(),
	exists: jest.fn(),
	stopDownload: jest.fn(),
	resumeDownload: jest.fn(),
	isResumable: jest.fn(),
	stopUpload: jest.fn(),
	completeHandlerIOS: jest.fn(),
	readDir: jest.fn(),
	readDirAssets: jest.fn(),
	existsAssets: jest.fn(),
	readdir: jest.fn(),
	setReadable: jest.fn(),
	stat: jest.fn(),
	readFile: jest.fn(),
	read: jest.fn(),
	readFileAssets: jest.fn(),
	hash: jest.fn(),
	copyFileAssets: jest.fn(),
	copyFileAssetsIOS: jest.fn(),
	copyAssetsVideoIOS: jest.fn(),
	writeFile: jest.fn(),
	appendFile: jest.fn(),
	write: jest.fn(),
	downloadFile: jest.fn(),
	uploadFiles: jest.fn(),
	touch: jest.fn(),
	MainBundlePath: jest.fn(),
	CachesDirectoryPath: jest.fn(),
	DocumentDirectoryPath: jest.fn(),
	ExternalDirectoryPath: jest.fn(),
	ExternalStorageDirectoryPath: jest.fn(),
	TemporaryDirectoryPath: jest.fn(),
	LibraryDirectoryPath: jest.fn(),
	PicturesDirectoryPath: jest.fn(),
}));