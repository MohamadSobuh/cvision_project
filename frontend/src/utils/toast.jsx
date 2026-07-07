import { toast } from "react-toastify";

export function notify(text, type = "success", options = {}) {
    const notifyByType = toast[type] || toast;
    return notifyByType(text, options);
}

export function confirmToast(
    message,
    {
        confirmText = "Confirm",
        cancelText = "Cancel",
        confirmType = "error",
    } = {},
) {
    return new Promise((resolve) => {
        let toastId;
        let resolved = false;

        const finish = (result) => {
            if (resolved) return;
            resolved = true;
            toast.dismiss(toastId);
            resolve(result);
        };

        toastId = toast(
            <div className="toast-confirm">
                <p className="toast-confirm__message">{message}</p>
                <div className="toast-confirm__actions">
                    <button
                        type="button"
                        className="toast-confirm__button toast-confirm__button--cancel"
                        onClick={() => finish(false)}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`toast-confirm__button toast-confirm__button--${confirmType}`}
                        onClick={() => finish(true)}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>,
            {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
                draggable: false,
                onClose: () => finish(false),
            },
        );
    });
}
