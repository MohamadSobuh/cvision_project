import styles from "./LoadingScreen.module.css";
import { useTranslation } from "react-i18next";

export default function LoadingScreen() {
    const { t , i18n } = useTranslation();

    return (
        <div className={styles.loading}>
            <div className={styles.box}>
                <div className={styles.spinner}></div>
                <h5><b>{t("loadingTitle")}</b></h5>
                <p className={styles.wait}>{t("loadingWait")}</p>
            </div>
        </div>
    );
}
