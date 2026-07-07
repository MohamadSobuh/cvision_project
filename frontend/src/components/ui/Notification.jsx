import { useEffect } from "react";

import { notify } from "../../utils/toast";

export default function Notification({ show = true, text, type = "success" }) {
    useEffect(() => {
        if (!show || !text) return;

        notify(text, type, {
            toastId: `notification-${type}-${text}`,
        });
    }, [show, text, type]);

    return null;
}
