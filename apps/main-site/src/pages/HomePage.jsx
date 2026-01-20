// Import home sections
import HeroSection from '../components/home/HeroSection';
import WhatWeDoSection from '../components/home/WhatWeDoSection';
import EventsSection from '../components/home/EventsSection';
import ImpactSection from '../components/home/ImpactSection';
import TeamPreviewSection from '../components/home/TeamPreviewSection';
import CommunitiesSection from '../components/home/CommunitiesSection';
// import CtaSection from '../components/home/CtaSection';
import ScrollProgress from '../components/ui/ScrollProgress';

const HomePage = () => {
  return (
    <>
      <ScrollProgress />
      <HeroSection />
      <WhatWeDoSection />
      <EventsSection />
      <CommunitiesSection />
      <ImpactSection />
      <TeamPreviewSection />
    </>
  );
};

export default HomePage;
