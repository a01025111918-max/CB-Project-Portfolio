import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import styles from "./TreeGrowMain.module.css";
import stage1Img from "../../assets/img/stage1.png";
import stage2Img from "../../assets/img/stage2.png";
import stage3Img from "../../assets/img/stage3.png";
import stage4Img from "../../assets/img/stage4.png";
import stage5Img from "../../assets/img/stage5.png";
import waterDropImg from "../../assets/img/waterdrop.png";
import useAuthStore from "../../store/useAuthStore";
import CloseIcon from "@mui/icons-material/Close";
import Swal from "sweetalert2";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const TreeGrowMain = ({ selectedRegionNo }) => {
  const GRAPH_MAX = 10000;
  const BAR_MAX_HEIGHT = 180;
  const BAR_MIN_HEIGHT = 14;

  const getBarHeight = (value) => {
    if (value <= 0) return BAR_MIN_HEIGHT;

    const ratio = value / GRAPH_MAX;
    const adjustedRatio = Math.sqrt(ratio);

    return Math.max(adjustedRatio * BAR_MAX_HEIGHT, BAR_MIN_HEIGHT);
  };

  const defaultMultiplier = [
    { name: "서울", value: "x1.2" },
    { name: "경기", value: "x1.0" },
    { name: "인천", value: "x2.1" },
    { name: "충청권", value: "x1.6" },
    { name: "전라권", value: "x1.7" },
    { name: "경상권", value: "x1.1" },
    { name: "강원권", value: "x3.0" },
    { name: "제주권", value: "x3.0" },
  ];
  const getRegionMultiplierValue = (regionName) => {
    const normalizedName = regionName?.trim();

    const multiplierMap = {
      서울: 1.2,
      경기: 1.0,
      인천: 2.1,
      충청: 1.6,
      충청권: 1.6,
      전라권: 1.7,
      경상권: 1.1,
      강원권: 3.0,
      제주권: 3.0,
    };

    return multiplierMap[normalizedName] ?? 1.0;
  };

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [ownedPoint, setOwnedPoint] = useState(0);

  const rankedChartData = chartData
    .map((item) => {
      const rank =
        chartData.filter((compareItem) => compareItem.value > item.value)
          .length + 1;

      return {
        ...item,
        rank,
      };
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.value - a.value;
    });

  const getLegendColorClass = (rank) => {
    if (rank === 1) return styles.gold;
    if (rank === 2) return styles.silver;
    if (rank === 3) return styles.bronze;
    return styles.blue;
  };

  const getBarColorClass = () => styles.blue;

  // 누적 경험치 기준
  const getStageByWater = (water) => {
    if (water >= 10000) return 5;
    if (water >= 5000) return 4;
    if (water >= 3000) return 3;
    if (water >= 1000) return 2;
    return 1;
  };

  const getStageLabel = (stage) => {
    if (stage === 1) return "새싹";
    if (stage === 2) return "성장 1단계";
    if (stage === 3) return "성장 2단계";
    if (stage === 4) return "성장 3단계";
    return "완성";
  };

  const getTreeImage = (stage) => {
    if (stage === 1) return stage1Img;
    if (stage === 2) return stage2Img;
    if (stage === 3) return stage3Img;
    if (stage === 4) return stage4Img;
    return stage5Img;
  };

  const getCurrentStageTarget = (water) => {
    if (water >= 10000) return 10000;
    if (water >= 5000) return 10000;
    if (water >= 3000) return 5000;
    if (water >= 1000) return 3000;
    return 1000;
  };
  const getStageStartWater = (water) => {
    if (water >= 10000) return 10000;
    if (water >= 5000) return 5000;
    if (water >= 3000) return 3000;
    if (water >= 1000) return 1000;
    return 0;
  };
  const getTreeScale = (stage) => {
    if (stage === 1) return 0.95;
    if (stage === 2) return 1.15;
    if (stage === 3) return 1.25;
    if (stage === 4) return 1.35;
    return 1.7;
  };

  const { memberId } = useAuthStore();
  const isLogin = !!memberId;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [showWaterRipple, setShowWaterRipple] = useState(false);

  const [treeClickCount, setTreeClickCount] = useState(0);
  const [showAbsorbEffect, setShowAbsorbEffect] = useState(false);
  const [showTreeBounce, setShowTreeBounce] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const [waterAmount, setWaterAmount] = useState(0);
  const regionWater = selectedRegion?.water ?? 0;

  const [resultData, setResultData] = useState({
    regionName: "",
    donatedWater: 0,
    appliedWater: 0,
    multiplier: 1.0,
    totalWater: 0,
    targetWater: 0,
    remainPoint: 0,
  });

  const currentStage = getStageByWater(regionWater);
  const currentStageLabel = getStageLabel(currentStage);
  const currentTreeImage = getTreeImage(currentStage);

  const currentStageTarget = getCurrentStageTarget(regionWater);
  const currentStageStartWater = getStageStartWater(regionWater);
  const currentTreeScale = getTreeScale(currentStage);
  const MAX_WATER = 100;

  const TREE_COMPLETE_WATER = 10000;
  const isTreeComplete = regionWater >= TREE_COMPLETE_WATER;

  const fetchTreeData = async () => {
    try {
      Swal.fire({
        title: "🌱 나무 성장 데이터 로딩 중...",
        text: "잠시만 기다려주세요",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const regionsRes = await axios.get(`${BACKSERVER}/regions`);
      const regions = regionsRes.data;

      const mappedChartData = regions.map((item) => ({
        name: item.regionName,
        value: item.treeExp,
        regionNo: item.regionNo,
      }));

      setChartData(mappedChartData);

      const selected =
        regions.find((item) => item.regionNo === selectedRegionNo) ||
        regions[0];

      if (selected) {
        setSelectedRegion({
          regionNo: selected.regionNo,
          name: selected.regionName,
          water: selected.treeExp,
          treeLevel: selected.treeLevel,
          totalPointUsed: selected.totalPointUsed,
          multiplier: getRegionMultiplierValue(selected.regionName),
        });
      }

      if (memberId) {
        const pointRes = await axios.get(
          `${BACKSERVER}/members/${memberId}/point`,
        );
        setOwnedPoint(pointRes.data);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);

      Swal.fire({
        icon: "error",
        title: "오류 발생",
        text: "데이터를 불러오지 못했습니다.",
      });
    } finally {
      Swal.close();
    }
  };
  useEffect(() => {
    fetchTreeData();
  }, [memberId, selectedRegionNo]);

  const handleWaterChange = (amount) => {
    setWaterAmount((prev) => Math.max(0, Math.min(prev + amount, MAX_WATER)));
  };
  const handleConfirmWater = async () => {
    if (waterAmount <= 0) {
      Swal.fire("포인트를 선택해주세요");
      return;
    }
    if (waterAmount > ownedPoint) {
      Swal.fire("포인트 부족");
      return;
    }

    try {
      Swal.fire({
        title: "물 주는 중...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await axios.post(`${BACKSERVER}/regions/contribute`, {
        memberId: memberId,
        regionNo: selectedRegion.regionNo,
        point: waterAmount,
      });

      const appliedWater = Math.round(waterAmount * selectedRegion.multiplier);
      const updatedRegionWater = regionWater + appliedWater;
      const updatedPoint = ownedPoint - waterAmount;
      const updatedTargetWater = getCurrentStageTarget(updatedRegionWater);

      setResultData({
        regionName: selectedRegion.name,
        donatedWater: waterAmount,
        appliedWater: appliedWater,
        multiplier: selectedRegion.multiplier,
        totalWater: updatedRegionWater,
        targetWater: updatedTargetWater,
        remainPoint: updatedPoint,
      });
      try {
      } catch (e) {
        console.error("공지 실패:", e);
      }

      Swal.close();

      setIsModalOpen(false);
      setIsCompleteModalOpen(true);
      setWaterAmount(0);

      await fetchTreeData();
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "오류",
        text:
          e.response?.data?.message || "물 주기 처리 중 오류가 발생했습니다.",
      });
    }
  };

  const getSeason = () => {
    const month = new Date().getMonth() + 1;

    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  };

  const season = getSeason();
  const isSpring = season === "spring";
  const isSummer = season === "summer";
  const isAutumn = season === "autumn";

  const getParticleCount = () => {
    if (season === "spring") return 12;
    if (season === "summer") return 8;
    if (season === "autumn") return 10;
    return 14;
  };

  const particleConfigs = useMemo(() => {
    return Array.from({ length: getParticleCount() }).map((_, idx) => ({
      id: `${season}-${idx}`,
      left: `${5 + ((idx * 11) % 90)}%`,
      animationDelay: `${idx * 0.9}s`,
      animationDuration:
        season === "winter" ? `${10 + (idx % 3)}s` : `${6 + (idx % 4)}s`,
      driftX1: `${Math.random() * 80 - 40}px`,
      driftX2: `${Math.random() * 80 - 40}px`,
    }));
  }, [season]);

  const currentStageProgress =
    currentStage === 5
      ? 100
      : ((regionWater - currentStageStartWater) /
          (currentStageTarget - currentStageStartWater)) *
        100;

  if (!selectedRegion) {
    return null;
  }
  const easterEggVariantClassMap = {
    spring: styles.springEasterEgg,
    summer: styles.summerEasterEgg,
    autumn: styles.autumnEasterEgg,
    winter: styles.winterEasterEgg,
  };

  const currentEasterEggVariantClass = easterEggVariantClassMap[season] || "";

  const handleTreeClick = () => {
    setShowAbsorbEffect(true);
    setShowTreeBounce(true);
    setTimeout(() => setShowAbsorbEffect(false), 1050);
    setTimeout(() => setShowTreeBounce(false), 950);

    setTreeClickCount((prev) => {
      const next = prev + 1;

      if (next >= 50) {
        setShowEasterEgg(true);

        setTimeout(() => {
          setShowEasterEgg(false);
        }, 8000);

        return 0;
      }

      return next;
    });
  };

  return (
    <div
      className={`${styles.treeGrowMain} ${styles[`stage${currentStage}`]} ${styles[season]} ${showEasterEgg ? currentEasterEggVariantClass : ""}`}
    >
      <section className={styles.topCard}>
        {showEasterEgg && (
          <>
            <div
              className={`${styles.easterEggSnowLayer} ${currentEasterEggVariantClass}`}
            >
              {Array.from({
                length:
                  season === "winter" ? 150 : season === "spring" ? 100 : 110,
              }).map((_, idx) => (
                <span
                  key={`snow-burst-${idx}`}
                  className={`${styles.easterEggSnowflake} ${styles.easterEggSnowflakeBurst}`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.12}s`,
                    animationDuration:
                      season === "winter"
                        ? `${2.4 + Math.random() * 1.2}s`
                        : season === "summer"
                          ? `${2.8 + Math.random() * 1.1}s`
                          : `${2.6 + Math.random() * 1.0}s`,
                    width:
                      season === "autumn"
                        ? `${10 + Math.random() * 10}px`
                        : season === "spring"
                          ? `${8 + Math.random() * 8}px`
                          : `${4 + Math.random() * 8}px`,
                    height:
                      season === "autumn"
                        ? `${10 + Math.random() * 10}px`
                        : season === "spring"
                          ? `${6 + Math.random() * 6}px`
                          : `${4 + Math.random() * 8}px`,
                  }}
                />
              ))}

              {Array.from({ length: season === "winter" ? 130 : 95 }).map(
                (_, idx) => (
                  <span
                    key={`snow-base-a-${idx}`}
                    className={styles.easterEggSnowflake}
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 1.6}s`,
                      animationDuration:
                        season === "winter"
                          ? `${3.2 + Math.random() * 2.4}s`
                          : season === "summer"
                            ? `${4.0 + Math.random() * 2.0}s`
                            : `${3.8 + Math.random() * 2.0}s`,
                      width:
                        season === "autumn"
                          ? `${10 + Math.random() * 8}px`
                          : season === "spring"
                            ? `${8 + Math.random() * 8}px`
                            : `${3 + Math.random() * 7}px`,
                      height:
                        season === "autumn"
                          ? `${10 + Math.random() * 8}px`
                          : season === "spring"
                            ? `${6 + Math.random() * 6}px`
                            : `${3 + Math.random() * 7}px`,
                    }}
                  />
                ),
              )}

              {Array.from({ length: season === "winter" ? 130 : 95 }).map(
                (_, idx) => (
                  <span
                    key={`snow-base-b-${idx}`}
                    className={styles.easterEggSnowflake}
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${0.7 + Math.random() * 1.8}s`,
                      animationDuration:
                        season === "winter"
                          ? `${3.4 + Math.random() * 2.6}s`
                          : season === "summer"
                            ? `${4.2 + Math.random() * 2.0}s`
                            : `${4.0 + Math.random() * 2.1}s`,
                      width:
                        season === "autumn"
                          ? `${10 + Math.random() * 8}px`
                          : season === "spring"
                            ? `${8 + Math.random() * 8}px`
                            : `${3 + Math.random() * 7}px`,
                      height:
                        season === "autumn"
                          ? `${10 + Math.random() * 8}px`
                          : season === "spring"
                            ? `${6 + Math.random() * 6}px`
                            : `${3 + Math.random() * 7}px`,
                    }}
                  />
                ),
              )}
            </div>

            {isSpring && (
              <>
                <div className={styles.springPetalPileBack}></div>
                <div className={styles.springPetalPileFront}></div>
              </>
            )}

            {isSummer && (
              <>
                <div className={styles.summerRainFloodBack}></div>
                <div className={styles.summerRainFloodFront}></div>
              </>
            )}

            {isAutumn && (
              <>
                <div className={styles.autumnLeafPileBack}></div>
                <div className={styles.autumnLeafPileFront}></div>
              </>
            )}

            {!isSpring && !isSummer && !isAutumn && (
              <>
                <div className={styles.easterEggSnowRise}></div>
                <div className={styles.easterEggSnowRiseFoam}></div>
              </>
            )}
          </>
        )}
        <div className={styles.seasonLayer}>
          {particleConfigs.map((particle) => (
            <span
              key={particle.id}
              className={`${styles.particle} ${styles[season + "Particle"]}`}
              style={{
                left: particle.left,
                animationDelay: particle.animationDelay,
                animationDuration: particle.animationDuration,
                "--drift-x1": particle.driftX1,
                "--drift-x2": particle.driftX2,
              }}
            />
          ))}
        </div>
        <div className={styles.topHeader}>
          <span className={styles.regionName}>{selectedRegion?.name}</span>
          <span className={styles.stageText}>{currentStageLabel}</span>
        </div>

        <div className={styles.topContent}>
          <div className={styles.leftInfo}>
            <div className={styles.multiplierBox}>
              <p className={styles.multiplierTitle}>물 주기 배율안내</p>
              <ul className={styles.multiplierList}>
                {defaultMultiplier.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.rightTreeArea}>
            <div className={styles.treeStageLabel}>{currentStageLabel}</div>
            <div className={styles.treeBox} onClick={handleTreeClick}>
              <div className={styles.treeFloatWrap}>
                <div
                  className={`${styles.treeScaleWrap} ${showTreeBounce ? styles.treeBounce : ""}`}
                  style={{ "--tree-scale": currentTreeScale }}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    key={currentStage}
                    src={currentTreeImage}
                    alt={currentStageLabel}
                    className={`${styles.treeImage} ${currentStage === 5 ? styles.completeTreeImage : ""}`}
                  />

                  {showAbsorbEffect && (
                    <div className={styles.absorbEffect}>
                      <img
                        loading="lazy"
                        decoding="async"
                        src={waterDropImg}
                        alt="흡수 물방울"
                        className={styles.absorbDrop}
                      />
                      <span className={styles.absorbSpark}></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.waterActionRow}>
            <div className={styles.waterInfoBox}>
              <div className={styles.waterGauge}>
                <div className={styles.waterGaugeInner}>
                  <div
                    className={styles.waterFill}
                    style={{ height: `${currentStageProgress}%` }}
                  />
                </div>

                <img
                  loading="lazy"
                  decoding="async"
                  src={waterDropImg}
                  alt="물방울 게이지"
                  className={styles.waterDropImage}
                />
              </div>

              <span className={styles.waterText}>
                {regionWater}
                <span className={styles.unit}>H2O</span>/{currentStageTarget}
                <span className={styles.unit}>H2O</span>
              </span>
            </div>

            <button
              className={styles.waterButton}
              disabled={isTreeComplete}
              onClick={() => {
                if (!isLogin) {
                  Swal.fire({
                    icon: "warning",
                    title: "로그인이 필요합니다",
                    text: "물 주기를 하려면 로그인해주세요!",
                    confirmButtonText: "로그인 하러가기",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      window.location.href = "/members/login";
                    }
                  });
                  return;
                }

                if (!isTreeComplete) {
                  setShowWaterRipple(true);
                  setTimeout(() => setShowWaterRipple(false), 900);

                  setIsModalOpen(true);
                }
              }}
            >
              {isTreeComplete ? "성장 완료" : "물 주기(포인트 기여)"}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.chartCard}>
        <div className={styles.chartInner}>
          <div className={styles.legendBox}>
            {rankedChartData.map((item) => (
              <div key={item.name} className={styles.legendItem}>
                <WaterDropIcon
                  className={`${styles.legendIcon} ${getLegendColorClass(item.rank)}`}
                />
                <span className={styles.legendLabel}>
                  {item.name} : {item.value}H2O
                </span>
              </div>
            ))}
          </div>

          <div className={styles.barChart}>
            {rankedChartData.map((item) => (
              <div key={item.name} className={styles.barItem}>
                <span className={styles.barValue}>{item.value}</span>
                <div
                  className={`${styles.bar} ${getBarColorClass()}`}
                  style={{
                    height: `${getBarHeight(item.value)}px`,
                  }}
                ></div>
                <span className={styles.barLabel}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <button
              className={styles.closeBtn}
              onClick={() => {
                setWaterAmount(0);
                setIsModalOpen(false);
              }}
            >
              <CloseIcon />
            </button>
            <h3>{selectedRegion?.name}에 물을 주시겠어요?</h3>

            <div className={styles.modalContent}>
              <p className={styles.needText}>
                다음 성장까지 필요한 물 {currentStageTarget - regionWater}H2O
              </p>

              {/* 중앙 물방울 */}
              <div className={styles.modalCenter}>
                <div className={styles.modalGauge}>
                  <div className={styles.modalGaugeInner}>
                    <div
                      className={styles.modalFill}
                      style={{ height: `${(waterAmount / MAX_WATER) * 100}%` }}
                    >
                      <div className={styles.modalWave}></div>
                    </div>
                  </div>

                  <img
                    loading="lazy"
                    decoding="async"
                    src={waterDropImg}
                    alt="물방울"
                    className={styles.modalWaterDrop}
                  />
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.leftText}>
                    보유 포인트: {ownedPoint}
                  </span>

                  <span className={styles.centerText}>
                    선택한 물: {waterAmount}H2O
                  </span>

                  <span className={styles.rightText}>
                    최대 {MAX_WATER}포인트
                  </span>
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className={styles.amountButtons}>
                <button
                  className={styles.minusBtn}
                  onClick={() => handleWaterChange(-100)}
                >
                  -100
                </button>
                <button
                  className={styles.minusBtn}
                  onClick={() => handleWaterChange(-50)}
                >
                  -50
                </button>
                <button
                  className={styles.minusBtn}
                  onClick={() => handleWaterChange(-10)}
                >
                  -10
                </button>

                <button
                  className={styles.plusBtn}
                  onClick={() => handleWaterChange(10)}
                >
                  +10
                </button>
                <button
                  className={styles.plusBtn}
                  onClick={() => handleWaterChange(50)}
                >
                  +50
                </button>
                <button
                  className={styles.plusBtn}
                  onClick={() => handleWaterChange(100)}
                >
                  +100
                </button>
              </div>

              <button
                className={styles.confirmFullBtn}
                onClick={handleConfirmWater}
              >
                물 주기
              </button>
            </div>
          </div>
        </div>
      )}
      {isCompleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.completeModalBox}>
            <div className={styles.completeInner}>
              <p className={styles.completeTitle}>
                {resultData.regionName}에 {resultData.donatedWater}H2O
                주었습니다.
              </p>

              <p>
                배율 x{resultData.multiplier} 적용 · 실제 반영{" "}
                {resultData.appliedWater}H2O
              </p>

              <div className={styles.completeWaterWrap}>
                <div className={styles.completeGauge}>
                  <div className={styles.completeGaugeInner}>
                    <div
                      className={styles.completeFill}
                      style={{
                        height: `${Math.min(
                          (resultData.totalWater / resultData.targetWater) *
                            100,
                          100,
                        )}%`,
                      }}
                    >
                      <div className={styles.completeWave}></div>
                    </div>
                  </div>

                  <img
                    loading="lazy"
                    decoding="async"
                    src={waterDropImg}
                    alt="물방울"
                    className={styles.completeWaterDrop}
                  />
                </div>

                <p className={styles.completeAmountText}>
                  {resultData.totalWater}H2O/{resultData.targetWater}H2O
                </p>
              </div>

              <p className={styles.remainPointText}>
                남은 보유포인트:{resultData.remainPoint}
              </p>

              <button
                className={styles.completeBtn}
                onClick={() => setIsCompleteModalOpen(false)}
              >
                물주기 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeGrowMain;
