// Static require() map for the 8 weather backgrounds (Metro needs literal paths).
import type { Weather } from '../engine/types';

export const BG_SOURCE: Record<Weather, ReturnType<typeof require>> = {
  morning: require('../../assets/backgrounds/bg-morning.png'),
  noon: require('../../assets/backgrounds/bg-noon.png'),
  dusk: require('../../assets/backgrounds/bg-dusk.png'),
  night: require('../../assets/backgrounds/bg-night.png'),
  rain: require('../../assets/backgrounds/bg-rain.png'),
  snow: require('../../assets/backgrounds/bg-snow.png'),
  rainbow: require('../../assets/backgrounds/bg-rainbow.png'),
  festival: require('../../assets/backgrounds/bg-festival.png'),
};
