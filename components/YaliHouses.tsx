import React from 'react';
import { YaliTypeA } from './YaliTypeA';
import { YaliTypeB } from './YaliTypeB';
import { YaliTypeC } from './YaliTypeC';

interface YaliProps {
  isAsia: boolean;
  isNight: boolean;
}

export const WaterfrontMansions: React.FC<YaliProps> = ({ isAsia, isNight }) => {
  return (
    <>
      <YaliTypeA isAsia={isAsia} isNight={isNight} />
      <YaliTypeB isAsia={isAsia} isNight={isNight} />
      <YaliTypeC isAsia={isAsia} isNight={isNight} />
    </>
  );
};