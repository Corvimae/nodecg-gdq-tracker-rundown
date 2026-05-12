import { NodeCGServer } from 'nodecg-types/types/lib/nodecg-instance';

const BUNDLE_NAME = 'nodecg-gdq-tracker-rundown';

export = (nodecg: NodeCGServer) => {
  const fetchInterval = nodecg.bundleConfig.fetchInterval || 60000;

  const rundown = nodecg.Replicant('rundown', BUNDLE_NAME, {
    defaultValue: {},
    persistent: false,
  });

  const runDataActiveRun = nodecg.Replicant<Record<string, unknown>>('runDataActiveRun', 'nodecg-speedcontrol');

  if (!nodecg.bundleConfig.trackerURL) {
    nodecg.log.warn('trackerURL config option is not set; rundown will not work.');

    return;
  }

  if (!nodecg.bundleConfig.eventId) {
    nodecg.log.warn('eventId config option is not set; rundown will not work.');

    return;
  }

    if (!nodecg.bundleConfig.trackerApiKey) {
    nodecg.log.warn('trackerApiKey config option is not set; rundown will not work.');

    return;
  }

  async function fetchFromTracker(path: string) {
    const request = await fetch(path, {
      headers: {
        Authorization: `Token ${nodecg.bundleConfig.trackerApiKey}`,
      },
    });
    
    try {
      const response = await request.json();

      if (request.status !== 200) throw new Error(`Error response from tracker: ${request.status} (${request.statusText}).`);
    
      if (response.next) return [...response.results, ...(await fetchFromTracker(response.next))];
    
      return response.results;
    } catch (e) {
      console.error(`Failed to fetch from ${path}:`);
      console.error(e);

      return [];
    }
  }

  async function fetchTrackerResource(eventId: number | string, resource: string) {
    const baseURL = nodecg.bundleConfig.trackerURL;
    const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.substr(0, baseURL.length - 1) : baseURL;
    
    return fetchFromTracker(`${normalizedBaseURL}/api/v2/events/${eventId}/${resource}`);
  }
  
  async function updateRundown() {
    try {
      const [runs, ads, interviews] = await Promise.all([
        fetchTrackerResource(nodecg.bundleConfig.eventId, 'runs'),
        fetchTrackerResource(nodecg.bundleConfig.eventId, 'ads'),
        fetchTrackerResource(nodecg.bundleConfig.eventId, 'interviews'),
      ]);

      const interstitials = [...ads, ...interviews];

      runs.sort((a, b) => a.order - b.order);

      const previousRunIndex = runs.findIndex(item => item.id === Number(runDataActiveRun.value.externalID)) - 1;

      rundown.value = runs.slice(previousRunIndex < 0 ? 0 : previousRunIndex).flatMap((run, index) => {
        const relevantInterstitials = interstitials.filter(item => item.order === run.order);
        
        relevantInterstitials.sort((a, b) => a.suborder - b.suborder);

        if (index === 0) return relevantInterstitials;

        return [run, ...relevantInterstitials];
      }).slice(0, nodecg.bundleConfig.rundownLength || 8);
    } catch (e) {
      nodecg.log.error(`Failed to update rundown:`);
      nodecg.log.error(e);
    }
  }

  runDataActiveRun.addListener('change', () => {
    updateRundown();
  });

  setInterval(updateRundown, fetchInterval);
};