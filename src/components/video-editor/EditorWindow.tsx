import { lazy, Suspense, useEffect } from "react";
import { ShortcutsProvider } from "../../contexts/ShortcutsContext";
import { loadAllCustomFonts } from "../../lib/customFonts";
import { AnnouncementDialog } from "../announcements/AnnouncementDialog";
import { LiveAnnouncementNotifications } from "../announcements/LiveAnnouncementNotifications";
import VideoEditor from "./VideoEditor";

const ShortcutsConfigDialog = lazy(() => import("./ShortcutsConfigDialog"));

export default function EditorWindow() {
	useEffect(() => {
		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});
	}, []);

	return (
		<>
			<ShortcutsProvider>
				<VideoEditor />
				<Suspense fallback={null}>
					<ShortcutsConfigDialog />
				</Suspense>
			</ShortcutsProvider>
			<AnnouncementDialog audience="editor" />
			<LiveAnnouncementNotifications audience="editor" />
		</>
	);
}
