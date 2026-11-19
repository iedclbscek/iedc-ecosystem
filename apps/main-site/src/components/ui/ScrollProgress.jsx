import { motion as Motion, useScroll } from 'framer-motion';

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();

  return (
    <>
      {/* Vertical progress bar only - no percentage */}
      <Motion.div
        className="fixed left-0 top-0 bottom-0 w-1 bg-accent z-50"
        style={{ scaleY: scrollYProgress, transformOrigin: "top" }}
      />
    </>
  );
};

export default ScrollProgress;
