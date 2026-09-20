import { getEvent, logEvent } from 'hub-mason-core/github/event';

import { AppContext } from './context/app-context';
import { routeEvent } from './router';

(async () => {
    const event = getEvent();
    logEvent(event);
    AppContext.getInstance();
    await routeEvent(event);
})();
