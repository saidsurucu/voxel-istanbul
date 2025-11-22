import React from 'react';
import { YaliTypeA } from './YaliTypeA';
import { YaliTypeB } from './YaliTypeB';
import { YaliTypeC } from './YaliTypeC';

interface YaliProps {
  isAsia: boolean;
}

export const WaterfrontMansions: React.FC<YaliProps> = ({ isAsia }) => {
  return (
    <>
      <YaliTypeA isAsia={isAsia} />
      <YaliTypeB isAsia={isAsia} />
      <YaliTypeC isAsia={isAsia} />
    </>
  );
};