import { HeroTopology } from "@/features/landing/hero-topology";
import { BeamCard } from "@/components/common/beam-card";
import { TiltFrame } from "@/components/common/tilt-frame";

/** Product shot: the architecture map, nothing fake floating on top. */
export function HeroStage() {
  return (
    <TiltFrame>
      <BeamCard>
        <HeroTopology />
      </BeamCard>
    </TiltFrame>
  );
}
