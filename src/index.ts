import { AppContext } from './context/app-context';
import { getEvent, logEvent } from './helpers/github/events';
import { routeEvent } from './router';

(async () => {
    const event = getEvent();

    logEvent(event);

    AppContext.getInstance();

    await routeEvent(event);
})();
