import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styles from "../../components/CVAnalyzerHero.module.css";

const PARTICLE_COLORS = [
    "#3b9eff",
    "#00e5c3",
    "#a855f7",
    "#f59e0b",
    "rgba(255,255,255,0.5)",
];

function generateParticles(count = 22) {
    return Array.from({ length: count }, (_, i) => {
        const isLine = Math.random() > 0.5;

        const width = isLine
            ? `${20 + Math.random() * 40}px`
            : `${3 + Math.random() * 5}px`;

        const height = isLine
            ? `${3 + Math.random() * 3}px`
            : `${3 + Math.random() * 5}px`;

        const color =
            PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

        const borderRadius = isLine ? "2px" : "50%";

        // movement path
        const angle1 = Math.random() * Math.PI * 2;
        const dist1 = 60 + Math.random() * 80;

        const tx1 = `${Math.cos(angle1) * dist1}px`;
        const ty1 = `${Math.sin(angle1) * dist1}px`;

        const angle2 = angle1 + (Math.random() - 0.5) * 0.8;
        const dist2 = dist1 + 20 + Math.random() * 30;

        const tx2 = `${Math.cos(angle2) * dist2}px`;
        const ty2 = `${Math.sin(angle2) * dist2}px`;

        const tx3 = tx2;
        const ty3 = `${parseFloat(ty2) + 20}px`;

        return {
            id: i,
            width,
            height,
            background: color,
            borderRadius,
            tx1,
            ty1,
            tx2,
            ty2,
            tx3,
            ty3,
            delay: 2 + Math.random() * 1.5,
            rotate: Math.random() * 360,
        };
    });
}

const particles = generateParticles(22);


export default function LoadingPage() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const { mode, file, selectedField, cvId } = location.state || {};

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate(`/user/analysisReport/${cvId}`, {
                state: {
                    mode,
                    file,
                    selectedField,
                    cvId
                }
            });
        }, 5000);

        return () => clearTimeout(timer);
    }, [cvId, file, mode, navigate, selectedField]);

    const loadingMessages = [
        t("loadingMessage1"),
        t("loadingMessage2"),
        t("loadingMessage3")
    ];

    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={
            i18n.dir() === "rtl"
                ? styles.loadingWrapperAr
                : styles.loadingWrapper
        }>
            <section className={styles.heroContainer}>
                <div className={styles.bgGrid} />
                <p className={styles.loadingText}>
                    <b> {loadingMessages[messageIndex]}</b>
                </p>
                <div className={styles.cvCard}>
                    <div className={styles.cvHeaderRow}>
                        <div className={styles.cvAvatar} />

                        <div className={styles.cvNameBlock}>
                            <div className={`${styles.cvLine} ${styles.wide}`} />
                            <div className={`${styles.cvLine} ${styles.mid}`} />
                        </div>
                    </div>

                    <div className={`${styles.cvLine} ${styles.accent} ${styles.short}`} />

                    <div className={styles.cvSection}>
                        <div className={styles.cvSectionTitle} />

                        {[80, 55, 65].map((w, i) => (
                            <div key={i} className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div
                                    className={styles.cvDotLine}
                                    style={{ width: `${w}%` }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className={styles.cvSection}>
                        <div className={styles.cvSectionTitle} />

                        {[70, 55].map((w, i) => (
                            <div key={i} className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div
                                    className={styles.cvDotLine}
                                    style={{ width: `${w}%` }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className={styles.cvSection}>
                        <div className={styles.cvSectionTitle} />

                        <div className={styles.cvSkillsRow}>
                            <div
                                className={styles.cvSkillTag}
                                style={{ width: "38px", background: "rgba(59,158,255,0.2)" }}
                            />
                            <div
                                className={styles.cvSkillTag}
                                style={{ width: "30px", background: "rgba(168,85,247,0.2)" }}
                            />
                            <div
                                className={styles.cvSkillTag}
                                style={{ width: "35px", background: "rgba(0,229,195,0.15)" }}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.scanLine} />
                <div className={styles.scanGlow} />

                <div className={styles.particlesLayer}>
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className={styles.particle}
                            style={{
                                width: p.width,
                                height: p.height,
                                background: p.background,
                                borderRadius: p.borderRadius,
                                left: "50%",
                                top: "50%",
                                animationDelay: `${p.delay}s`,
                                transform: `rotate(${p.rotate}deg)`,
                                "--tx1": p.tx1,
                                "--ty1": p.ty1,
                                "--tx2": p.tx2,
                                "--ty2": p.ty2,
                                "--tx3": p.tx3,
                                "--ty3": p.ty3,
                            }}
                        />
                    ))}
                </div>

                <div className={styles.insightsPanel}>
                    <div className={styles.insightsHeader}>
                        <span className={styles.insightsTitle}>Analysis Report</span>
                    </div>

                    <div className={styles.scoreWrap}>
                        <div className={styles.scoreRing}>
                            <svg width="52" height="52" viewBox="0 0 52 52">
                                <circle className={styles.ringBg} cx="26" cy="26" r="22" />
                                <circle className={styles.ringFill} cx="26" cy="26" r="22" />
                            </svg>
                            <div className={styles.scoreNum}>85%</div>
                        </div>

                        <div className={styles.scoreInfo}>
                            <span className={styles.scoreLabel}>CV Score</span>
                            <span className={styles.scoreValue}>Excellent</span>
                        </div>
                    </div>

                    <div className={styles.bars}>
                        {[
                            { name: "React", score: "82%", cls: styles.b1 },
                            { name: "Java Script", score: "67%", cls: styles.b2 },
                            { name: "UI/UX", score: "75%", cls: styles.b3 },
                        ].map((item, i) => (
                            <div key={i} className={styles.barRow}>
                                <div className={styles.barLabelRow}>
                                    <span>{item.name}</span>
                                    <span style={{ color: "#3b9eff" }}>{item.score}</span>
                                </div>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.barFill} ${item.cls}`} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.pills}>
                        <span className={styles.pill}>Full Stack Developer</span>
                        <span className={styles.pill}>ATS Ready</span>
                        <span className={styles.pill}>UI / UX Design</span>
                        <span className={styles.pill}>+ Update Bio</span>
                    </div>
                </div>

            </section>

        </div>

    );
}
