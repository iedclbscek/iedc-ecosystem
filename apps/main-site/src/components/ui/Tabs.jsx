import { motion } from 'framer-motion';

const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex justify-center mb-12">
      <div className="inline-flex bg-primary/30 p-1 rounded-lg shadow-sm">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative px-6 py-2 text-lg font-medium rounded-md transition-all duration-200 ${
              activeTab === tab
                ? "text-accent"
                : "text-text-light hover:text-text-dark"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-md shadow-sm -z-10"
                initial={false}
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
