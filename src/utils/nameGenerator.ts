const adjectives = [
  'Quiet', 'Swift', 'Silent', 'Vibrant', 'Mystic', 'Brave', 'Calm', 'Wild', 
  'Golden', 'Silver', 'Shadow', 'Frost', 'Lunar', 'Solar', 'Neon', 'Ancient'
];

const nouns = [
  'Panda', 'Shadow', 'Echo', 'Wolf', 'Eagle', 'Phoenix', 'Tiger', 'Raven', 
  'Ghost', 'Storm', 'Blade', 'Star', 'Void', 'Pulse', 'Spark', 'Drift'
];

const colors = [
  '#e94560', '#4ecca3', '#45b7d1', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9', '#fab1a0'
];

export const generateRandomUsername = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

export const getRandomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)];
};
