import { FaExclamationCircle, FaSpinner } from "react-icons/fa";
import styles from "./AdminDataState.module.css";

export default function AdminDataState({
    type = "loading",
    title,
    message,
    retryLabel,
    onRetry,
}) {
    const isLoading = type === "loading";

    return (
        <div
            className={styles.state}
            role={isLoading ? "status" : "alert"}
            aria-live="polite"
        >
            {isLoading ? (
                <FaSpinner className={styles.spinner} />
            ) : (
                <FaExclamationCircle className={styles.errorIcon} />
            )}
            <h3>{title}</h3>
            <p>{message}</p>
            {!isLoading && onRetry && (
                <button type="button" className={styles.retryButton} onClick={onRetry}>
                    {retryLabel}
                </button>
            )}
        </div>
    );
}
