import type { Archetype } from '@/types';

/**
 * Six archetypes positioned in AVD space (a, v, d) — each occupies a distinct
 * region. Scoring computes distance from the user's accumulated AVD vector
 * to each archetype, plus emotion-tile intersection.
 */
export const ARCHETYPES: Archetype[] = [
  {
    id: 'mellow_contemplative',
    name: 'The Late-Night Architect',
    variation: '2010s · Lo-fi piano',
    avd: [0.20, 0.45, 0.80],
    emotions: ['nostalgic', 'melancholic', 'peaceful', 'tender'],
    forer: [
      'You appreciate music that rewards a second listen — the kind with hidden depth.',
      'You are drawn to the second half of songs more than the first.',
      "You resist anything that asks for your full attention before earning it, but you'll give an entire night to a song that does.",
      'You keep your saddest songs for cab rides home.',
      'You are moved by what other people find too quiet.',
    ],
  },
  {
    id: 'sophisticated_melancholic',
    name: 'The Velvet Mystic',
    variation: '1980s · Chamber dream-pop',
    avd: [0.30, 0.25, 0.85],
    emotions: ['awed', 'tender', 'melancholic', 'nostalgic'],
    forer: [
      'You hear the architecture in songs other people only feel.',
      "You are moved most by music that takes its time getting where it's going.",
      'There is one orchestral passage you have used as armour.',
      "You would rather a beautiful sad song than a clever happy one — and you don't apologise for it.",
      'You collect chord changes the way other people collect photographs.',
    ],
  },
  {
    id: 'unpretentious_warm',
    name: 'The Hearth-Keeper',
    variation: '1970s · Folk Americana',
    avd: [0.40, 0.75, 0.35],
    emotions: ['tender', 'peaceful', 'nostalgic'],
    forer: [
      'You trust music that sounds like it could be played in a kitchen.',
      "You've made playlists for people who never knew they were the subject.",
      "You're suspicious of anything too polished, but you forgive it if the voice is true.",
      "You've cried to a song someone else found cheesy and not been embarrassed.",
      'You play certain songs only when the light is gold.',
    ],
  },
  {
    id: 'contemporary_groove',
    name: 'The Slow Glow',
    variation: '2020s · Downtempo soul',
    avd: [0.55, 0.70, 0.45],
    emotions: ['tender', 'peaceful', 'defiant'],
    forer: [
      'You move when no one is watching, and you know which songs unlock that.',
      "You're drawn to bass you can feel in the floor.",
      'You skip the verses on your favourite songs to get back to the part you actually want.',
      "A drum that swings will get you further with you than a drum that's perfect.",
      'You play music the way other people pour wine — to set the room.',
    ],
  },
  {
    id: 'intense_dark',
    name: 'The Quiet Insurgent',
    variation: '2010s · Post-rock minor',
    avd: [0.85, 0.25, 0.55],
    emotions: ['defiant', 'melancholic', 'awed'],
    forer: [
      "You like music that sounds like it's fighting something.",
      'A song without tension feels to you like a meal without salt.',
      "You've walked alone through a city at night with one specific song doing the heavy lifting.",
      "You distrust music that's trying to be liked.",
      'Catharsis matters more to you than comfort.',
    ],
  },
  {
    id: 'euphoric_pop',
    name: 'The Sky-Seeker',
    variation: '2020s · Cinematic awe',
    avd: [0.80, 0.85, 0.55],
    emotions: ['awed', 'defiant'],
    forer: [
      'You want music that arrives somewhere — that earns its ending.',
      "You've been moved by a song you would never admit to in public.",
      'You will forgive a lot for a chord change that lifts.',
      'You like to be reminded that things can be big.',
      'Hope embarrasses some people; you just let it in.',
    ],
  },
];
