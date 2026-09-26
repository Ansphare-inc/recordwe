import path from "node:path";
import { app } from "electron";

// These paths are set lazily when app is ready
let userDataPath: string | null = null;

export function getUserDataPath(): string {
	if (userDataPath !== null) {
		return userDataPath;
	}

	if (process.env["VITE_DEV_SERVER_URL"]) {
		const devUserDataPath = path.join(app.getPath("appData"), "RecordWe-dev");
		app.setPath("userData", devUserDataPath);
		app.setPath("sessionData", path.join(devUserDataPath, "session"));
	}
	
	userDataPath = app.getPath("userData");
	return userDataPath;
}

export function getRecordingsDir(): string {
	return path.join(getUserDataPath(), "recordings");
}

// Legacy exports for compatibility - these will throw if called before app is ready
export const USER_DATA_PATH = getUserDataPath();
export const RECORDINGS_DIR = path.join(USER_DATA_PATH, "recordings");
