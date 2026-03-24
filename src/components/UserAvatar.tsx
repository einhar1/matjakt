import Avatar from "boring-avatars";

type UserAvatarProps = {
  userId: string;
  // Allow parent to style it
  className?: string;
  size?: number;
}

const PALETTES = [
  ["#51b351ff", "#2a5c2a", "#85e085", "#f0fff0", "#142e14"], // Green
  ["#3b82f6", "#1e40af", "#93c5fd", "#eff6ff", "#172554"], // Blue
  ["#8b5cf6", "#5b21b6", "#c4b5fd", "#f5f3ff", "#2e1065"], // Purple
  ["#f97316", "#9a3412", "#fdba74", "#fff7ed", "#7c2d12"], // Orange
  ["#f43f5e", "#9f1239", "#fda4af", "#fff1f2", "#881337"], // Red
  ["#65758bff", "#334155ff", "#cbd5e1", "#f1f5f9", "#0f172a"], // Grey
  // From https://coolors.co/palettes/popular/5%20colors
  ["#f7d1cd", "#e8c2ca", "#d1b3c4", "#b392ac", "#735d78"], // Soft Pastels
  ["#cdb4db", "#ffc8dd", "#ffafcc", "#bde0fe", "#a2d2ff"], // Pastel Dreamland Adventure
  ["#f7b267", "#f79d65", "#f4845f", "#f27059", "#f25c54"], // Sunset Shades
  ["#595959", "#7f7f7f", "#a5a5a5", "#cccccc", "#f2f2f2"], // Silver lining
  ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"], // Ocean Breeze
];


export function UserAvatar(props: UserAvatarProps) {

  /* Choose a color based on userId */
  const Index = props.userId.charCodeAt(0) % PALETTES.length;
  const colors = PALETTES[Index]

  return (
    <div className={`profile-pic ${props.className ? props.className : ""}`}>
      <Avatar
        size={props.size ? props.size : 40}
        name={props.userId}
        variant="beam"
        colors={colors}
      />
    </div>
  );
}