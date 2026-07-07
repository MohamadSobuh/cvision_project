import styles from "./CVAnalyzerHero.module.css";
import { useTranslation } from "react-i18next";

import { Link } from "react-router-dom";

const PARTICLE_COLORS = [
    "#3b9eff",
    "#00e5c3",
    "#a855f7",
    "#f59e0b",
    "rgba(255,255,255,0.5)",
];

function generateParticles(count = 12) {
    return Array.from({ length: count }, (_, i) => {
        const isLine = Math.random() > 0.5;
        const w = isLine
            ? `${20 + Math.random() * 40}px`
            : `${3 + Math.random() * 5}px`;
        const h = isLine
            ? `${3 + Math.random() * 3}px`
            : `${3 + Math.random() * 5}px`;
        const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        const borderRadius = isLine ? "2px" : "50%";

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

        const delay = 2 + Math.random() * 1.5;
        const rotate = Math.random() * 360;

        return {
            id: i,
            width: w,
            height: h,
            background: color,
            borderRadius,
            tx1, ty1, tx2, ty2, tx3, ty3,
            delay,
            rotate,
        };
    });
}

const particles = generateParticles();

export default function Hero({ language }) {
    const { t } = useTranslation();

    return (
        <div className={styles.cvAnalyzerRoot} >
            <div className={styles.bgGrid} />


            <section className={styles.hero}>

                
                <div className={styles.heroText}>

                    <div className={styles.badge}> <span className={styles.badgeDot} /> {t('desWeb')} </div>

                    <h1 className={styles.headline}> <b>{t('heroTitle1')}</b><br />
                        <span className={styles.highlight}><b>{t('heroTitle2')}</b></span>
                    </h1>

                    <p className={styles.subtext}>
                        {t('heroDesc')}
                    </p>

                    <div className={styles.ctaWrap}>
                        <Link
                            to="/login"
                            state={{ language }}
                            className={styles.btnPrimary}
                        >
                            {t('getStarted')}
                        </Link>
                    </div>
                </div>


                <div className={styles.stage}>
                    {/* هاد ل  السكور */}
                    <svg width="0" height="0" style={{ position: "absolute" }}>
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b9eff" />
                                <stop offset="100%" stopColor="#00e5c3" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* الكارد الفاضية */}
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
                            <div className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div className={styles.cvDotLine} style={{ width: "80%" }} />
                            </div>
                            <div className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div className={styles.cvDotLine} style={{ width: "55%" }} />
                            </div>
                            <div className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div className={styles.cvDotLine} style={{ width: "65%" }} />
                            </div>
                        </div>

                        <div className={styles.cvSection}>
                            <div className={styles.cvSectionTitle} />
                            <div className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div className={styles.cvDotLine} style={{ width: "70%" }} />
                            </div>
                            <div className={styles.cvDotRow}>
                                <div className={styles.cvDot} />
                                <div className={styles.cvDotLine} style={{ width: "55%" }} />
                            </div>
                        </div>

                        <div className={styles.cvSection}>
                            <div className={styles.cvSectionTitle} />
                            <div className={styles.cvSkillsRow}>
                                <div
                                    className={styles.cvSkillTag}
                                    style={{
                                        width: "38px",
                                        background: "rgba(59,158,255,0.2)",
                                    }}
                                />
                                <div
                                    className={styles.cvSkillTag}
                                    style={{
                                        width: "30px",
                                        background: "rgba(168,85,247,0.2)",
                                    }}
                                />
                                <div
                                    className={styles.cvSkillTag}
                                    style={{
                                        width: "35px",
                                        background: "rgba(0,229,195,0.15)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* خط المسح */}
                    <div className={styles.scanLine} />
                    <div className={styles.scanGlow} />

                    {/* المكونات المتطايرة */}
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
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

                    {/* محتوى السي في المحلل */}
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
                            <div className={styles.barRow}>
                                <div className={styles.barLabelRow}>
                                    <span>React</span>
                                    <span style={{ color: "#3b9eff" }}>82%</span>
                                </div>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.barFill} ${styles.b1}`} />
                                </div>
                            </div>
                            <div className={styles.barRow}>
                                <div className={styles.barLabelRow}>
                                    <span>Java Script</span>
                                    <span style={{ color: "#c084fc" }}>67%</span>
                                </div>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.barFill} ${styles.b2}`} />
                                </div>
                            </div>
                            <div className={styles.barRow}>
                                <div className={styles.barLabelRow}>
                                    <span>UI/UX</span>
                                    <span style={{ color: "#fbbf24" }}>75%</span>
                                </div>
                                <div className={styles.barTrack}>
                                    <div className={`${styles.barFill} ${styles.b3}`} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.pills}>
                            <span className={styles.pill}>Full Stack Developer</span>
                            <span className={styles.pill}>ATS Ready</span>
                            <span className={styles.pill}>UI / UX Design</span>
                            <span className={styles.pill}>+ Update Bio</span>
                        </div>
                    </div>
                </div>

            </section>
        </div>
    );
}
