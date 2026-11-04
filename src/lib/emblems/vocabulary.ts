// The emblems a crest can carry. Every id is drawn once (in animals.ts, plants.ts or things.ts) and each crest city is given one of them as its device,
// chosen for a real symbol of that city: its animal, tree, flower, landmark, trade or history.

export const ANIMALS = [
  'lion', 'eagle', 'bear', 'wolf', 'horse', 'stag', 'bull', 'ram', 'boar', 'fox', 'fish', 'dolphin', 'whale', 'crab', 'bee', 'dragon', 'owl', 'swan', 'camel',
  'elephant', 'tiger', 'hawk', 'bat', 'snake', 'turtle', 'crane', 'seagull', 'pelican', 'bison', 'kangaroo', 'panda', 'moose', 'penguin', 'beaver', 'rooster', 'dove',
] as const;

export const PLANTS = [
  'palm', 'pine', 'oak', 'lotus', 'rose', 'maple', 'wheat', 'grapes', 'blossom', 'olive', 'cactus', 'sunflower', 'tulip', 'lily', 'laurel', 'orange', 'apple',
  'pineapple', 'bamboo', 'fern',
] as const;

export const THINGS = [
  'anchor', 'bridge', 'tower', 'gate', 'crown', 'key', 'ship', 'bell', 'sun', 'moon', 'star', 'mountain', 'wave', 'river', 'gear', 'cross', 'book', 'hammer', 'castle',
  'torch', 'sword', 'windmill', 'dome', 'pagoda', 'pyramid', 'lighthouse', 'cathedral', 'skyline', 'obelisk', 'arch', 'fountain', 'lantern', 'drum', 'guitar', 'lyre',
  'compass', 'shell', 'diamond', 'derrick', 'rocket', 'plane', 'train', 'volcano', 'waterfall', 'minaret', 'torii', 'mask', 'coin', 'scales', 'sailboat', 'needle', 'tent',
] as const;

export type EmblemId = (typeof ANIMALS)[number] | (typeof PLANTS)[number] | (typeof THINGS)[number];
export const ALL_EMBLEMS: readonly EmblemId[] = [...ANIMALS, ...PLANTS, ...THINGS];

/** The field a shield can have, and the patterns laid over it. */
export const FIELDS = ['crimson', 'azure', 'emerald', 'gold', 'purple', 'black', 'teal', 'orange', 'silver', 'brown', 'rose', 'forest'] as const;
export const PATTERNS = ['plain', 'chevron', 'bend', 'fess', 'pale', 'checks', 'saltire', 'chief', 'roundels', 'stripes'] as const;
export type Field = (typeof FIELDS)[number];
export type Pattern = (typeof PATTERNS)[number];
