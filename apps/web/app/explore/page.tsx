import { Suspense } from 'react';
import { ExploreScreen } from '@/components/explore/ExploreScreen';

export const metadata = {
  title: 'Explore',
  description: 'Every country on one map of flags. Tap a country for sourced facts, or colour the world by population, density and area.',
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">Explore the world map</h1>
      <Suspense>
        <ExploreScreen />
      </Suspense>
    </>
  );
}
