export const getDistrictEmoji = (name: string): string => {
  switch (name) {
    case 'Chennai': return '🏙️';
    case 'Madurai': return '🕌';
    case 'Tirunelveli': return '🌊';
    case 'Virudhunagar': return '🌾';
    case 'Coimbatore': return '🏭';
    case 'Salem': return '🗻';
    case 'Tiruchirappalli': return '🏛️';
    case 'Kanyakumari': return '🌅';
    default: return '📍';
  }
};
