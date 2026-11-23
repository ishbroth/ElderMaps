import { glimpseCost, hasTownLegend, sceneFor } from './lib/scenes';
import { KIND_TITLE, type Province } from './lib/lore';

interface Props {
  spot: { name: string; real: string; kind: string; note: string };
  province: Province;
  icon: string;
  /** Said when a button that needs an account is pressed. */
  onNeedsAccount: (what: string) => void;
  onTravel: () => void;
  onClose: () => void;
}

/** The scene of a place: its story, and the buttons for a glimpse (the paid picture of it) and, for a city, the Town Legend. */
export default function SceneView({ spot, province, icon, onNeedsAccount, onTravel, onClose }: Props) {
  const lines = sceneFor(spot.name, spot.kind, province.id);
  const cost = glimpseCost(spot.kind);
  return (
    <div className="em-scene-back" role="dialog" aria-modal="true" aria-label={`${spot.name}: its story`} onClick={onClose}>
      <article className="em-scene" style={{ ['--prov' as string]: province.ink }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="em-card-x" onClick={onClose} aria-label="Close">×</button>
        <div className="em-card-icon" dangerouslySetInnerHTML={{ __html: icon }} />
        <h2>{spot.name}</h2>
        <p className="em-card-kind">{KIND_TITLE[spot.kind] ?? spot.kind}</p>
        <div className="em-scene-lore">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>
        <div className="em-card-buttons">
          <button type="button" className="em-btn" onClick={() => onNeedsAccount('A GLIMPSE')} title="See this place as it might stand in the realm">
            GLIMPSE · {cost} SEPTIMS <span aria-hidden="true">🔒</span>
          </button>
          {hasTownLegend(spot.kind) && (
            <button type="button" className="em-btn em-btn-ghost" onClick={() => onNeedsAccount('THE TOWN LEGEND')} title="The whole city map, with every place travellers have glimpsed">TOWN LEGEND</button>
          )}
          <button type="button" className="em-btn em-btn-ghost" onClick={onTravel}>FAST TRAVEL</button>
        </div>
      </article>
    </div>
  );
}
