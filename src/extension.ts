import { NodeCGServer } from 'nodecg-types/types/lib/nodecg-instance';
import fetch from 'node-fetch';
import FormData from 'form-data';
import makeFetchCookie from 'fetch-cookie';
import { URLSearchParams } from 'url';

const BUNDLE_NAME = 'nodecg-gdq-tracker-rundown';

const CSRF_TOKEN_REGEX = /<input[^>]*name=\"csrfmiddlewaretoken\"[^>]*value=\"([^\"]*)\"/g;
export = (nodecg: NodeCGServer) => {
  const fetchInterval = nodecg.bundleConfig.fetchInterval || 60000;
  const jar = new makeFetchCookie.toughCookie.CookieJar();
  const fetchCookie = makeFetchCookie(fetch, jar);

  const rundown = nodecg.Replicant('rundown', BUNDLE_NAME, {
    defaultValue: {},
    persistent: false,
  });

  const runDataActiveRun = nodecg.Replicant<Record<string, unknown>>('runDataActiveRun', 'nodecg-speedcontrol');

  const trackerCookie = { current: null };

  if (!nodecg.bundleConfig.trackerURL) {
    nodecg.log.warn('trackerURL config option is not set; rundown will not work.');

    return;
  }

  if (!nodecg.bundleConfig.eventId) {
    nodecg.log.warn('eventId config option is not set; rundown will not work.');

    return;
  }

  async function fetchFromTracker(path: string) {
    const response = await fetchCookie(`${nodecg.bundleConfig.trackerURL}/${path}`);
    
    try {
      return await response.json();
    } catch (e) {
      nodecg.log.error(`Failed to fetch from ${path}:`);
      nodecg.log.error(e);

      return [];
    }
  }

  async function authenticate() {
    if (!nodecg.bundleConfig.adminURL) return;

    const loginUrl = `${nodecg.bundleConfig.adminURL}/login/`;
    
    const loginPageResponse = await fetchCookie(loginUrl);
    const loginPageBody = await loginPageResponse.text();

    const tokenMatch = CSRF_TOKEN_REGEX.exec(loginPageBody);

    if (!tokenMatch) return;

    const formData = new URLSearchParams();

    formData.append('username', nodecg.bundleConfig.trackerUsername);
    formData.append('password', nodecg.bundleConfig.trackerPassword);
    formData.append('csrfmiddlewaretoken', tokenMatch[1]);
    
    const formResponse = await fetchCookie(loginUrl, {
      method: 'POST',
      headers: {
        Referer: loginUrl,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    trackerCookie.current = formResponse.headers.raw()['set-cookie'];
  }

  
  async function updateRundown() {
    try {
      await authenticate();

      const [runs, ads, interviews] = await Promise.all([
        fetchFromTracker(`api/v1/search?type=run&event=${nodecg.bundleConfig.eventId}`),
        fetchFromTracker(`api/v1/ads/${nodecg.bundleConfig.eventId}`),
        fetchFromTracker(`api/v1/interviews/${nodecg.bundleConfig.eventId}`),
      ]);

      const interstitials = [...ads, ...interviews];

      runs.sort((a, b) => a.fields.order - b.fields.order);

      const previousRunIndex = runs.findIndex(item => item.pk === Number(runDataActiveRun.value.externalID)) - 1;

      rundown.value = runs.slice(previousRunIndex < 0 ? 0 : previousRunIndex).flatMap((run, index) => {
        const relevantInterstitials = interstitials.filter(item => item.fields.order === run.fields.order);
        
        relevantInterstitials.sort((a, b) => a.fields.suborder - b.fields.suborder);

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