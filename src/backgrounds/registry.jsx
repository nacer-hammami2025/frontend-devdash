import NeuralWeaveBackground from '../components/NeuralWeaveBackground.jsx';
import GradientFlow from './GradientFlow.jsx';
import ParticleField from './ParticleField.jsx';

/*
  Background Registry
  ------------------------------------------------------------
  Fournit un catalogue de variantes animées liées à l'identité DevDash.
  Chaque entrée suit la signature ({ intensityFactor }) => <Component />.

  Ajout futur:
    - BarsReactive (barres fréquence)
    - TimelineWave (courbes scroll horizontales)
    - CodeMatrix (glyphes pseudo-code tombants)
*/

export const BACKGROUNDS = {
  neural: (props) => <NeuralWeaveBackground {...props} />, // existant (réactif audio)
  gradient: (props) => <GradientFlow {...props} intensity={props.intensityFactor} />,
  particles: (props) => <ParticleField {...props} intensity={props.intensityFactor} />
};

export const ORDER = ['neural', 'gradient', 'particles'];
