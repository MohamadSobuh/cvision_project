import style from "./WhyCVison.module.css";
import { useTranslation } from "react-i18next";

import {FaRegFileAlt, FaBrain, FaList} from "react-icons/fa";

const steps = [
    {
        color: "#F1416F",
        shadowColor: "rgba(241,65,111,.4)",
        bg: "#fce1e6",
        border: "rgba(241,65,111,.25)",
        iconBg: "rgba(241,65,111,.13)",
        numColor: "#d48f9c",
        Icon: FaRegFileAlt,
        titleKey: "card1Title",
        descKey: "card1Desc",
        rotate: -7,
        translateY: "12px",
    },
    {
        color: "#3FB48D",
        shadowColor: "rgba(63,180,141,.4)",
        bg: "#ccf3e3",
        border: "rgba(63,180,141,.25)",
        iconBg: "rgba(63,180,141,.13)",
        numColor: "#7cc5a7",
        Icon: FaBrain,
        titleKey: "card2Title",
        descKey: "card2Desc",
        rotate: 5,
        translateY: "12px",
    },
    {
        color: "#F76D2F",
        shadowColor: "rgba(247,109,47,.4)",
        bg: "#FEE9DA",
        border: "rgba(247,109,47,.25)",
        iconBg: "rgba(247,109,47,.13)",
        numColor: "#e6a171",
        Icon: FaList,
        titleKey: "card3Title",
        descKey: "card3Desc",
        rotate: 16,
        translateY: "30px",
    },
];

export default function WhyCVison({ language }) {
    const { t } = useTranslation();
    const isRTL = language === "ar";

    return (
        <section id="how" className={style.whyCVision}>
            <span className={style.sectionLabel}>{t('navFeatures')}</span>
            <h2 className={style.sectionTitle}>{t('whyTitle')}</h2>
            <div className={style.fan}>
                {steps.map((step, i) => {
                    const { Icon } = step;
                    return (
                        <div
                            key={i}
                            className={`${style.card} ${isRTL ? style.rtl : ""}`} 
                            style={{
                                background: step.bg,
                                border: `1px solid ${step.border}`,
                                "--rotate": `${isRTL ? step.rotate * -1 : step.rotate}deg`,
                                "--translateY": step.translateY,
                                "--accent": step.color,
                                "--shadow": step.shadowColor,
                                zIndex: i === 0 || i === 3 ? 1 : i === 2 ? 3 : 2,
                            }}
                        >
                            <div className={style.stepNum} style={{ color: step.numColor }}>
                                {`0${i + 1}`}
                            </div>

                            <div
                                className={style.iconWrap}
                                style={{ background: step.iconBg }}
                            >
                                <Icon size={22} color={step.color} />
                            </div>

                            <h3 className={style.cardTitle}>{t(step.titleKey)}</h3>
                            <p className={style.cardDesc}>{t(step.descKey)}</p>

                        </div>
                    );
                })}
            </div>

            <p className={style.hint}>hover the cards to expand</p>
        </section>
    );
}
