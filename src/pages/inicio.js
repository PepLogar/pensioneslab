// The landing page (index.html), light on purpose for phones: it loads no engine and no data
// (src/shared/light-header.js). A shared scenario link is sent to the console by the page's head.
import { mountLightHeader } from '../shared/light-header.js';

mountLightHeader('portada');
