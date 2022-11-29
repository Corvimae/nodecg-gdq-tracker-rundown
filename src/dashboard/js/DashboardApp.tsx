import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useReplicant } from './utils/hooks';

const BUNDLE_NAMESPACE = 'nodecg-gdq-tracker-rundown';

interface Speedrun {
  name: string;
  category: string;
  run_time: string;
  setup_time: string;
  deprecated_runners: string;
}

interface Ad {
  sponsor_name: string;
  ad_name: string;
  ad_type: string;
  filename: string;
}

interface Interview {
  interviewers: string;
  subjects: string;
  topic: string;
}

const SpeedrunItem: React.FC<{ data: Speedrun }> = ({ data }) => (
  <RundownItem>
    <RundownTitle>
      <div>{data.name}</div>
      <div>{data.run_time}</div>
    </RundownTitle>
    <RundownRow>
      <div>{data.category} by {data.deprecated_runners}</div>
      <div>({data.setup_time} setup)</div>
    </RundownRow>
  </RundownItem>
);

const AdItem: React.FC<{ data: Ad }> = ({ data }) => (
  <InterstitialItemContainer>
    <RundownTitle>
      <div>AD: {data.ad_name}</div>
      <div>{data.ad_type}</div>
    </RundownTitle>
    <RundownRow>
      <div>{data.sponsor_name}</div>
      <div>File: {data.filename}</div>
    </RundownRow>
  </InterstitialItemContainer>
);

const InterviewItem: React.FC<{ data: Interview }> = ({ data }) => (
  <InterstitialItemContainer>
    <RundownTitle>
      <div>INTERVIEW: {data.topic}</div>
    </RundownTitle>
    <RundownRow>
      <div>Talent: {data.interviewers}</div>
    </RundownRow>
    <RundownRow>
      <div>Interviewee(s): {data.subjects}</div>
    </RundownRow>
  </InterstitialItemContainer>
);

export const DashboardApp: React.FC = () => {
  const [rundown] = useReplicant('rundown', [], {
    namespace: BUNDLE_NAMESPACE,
  });

  return (
    <Container>
      {rundown.map((item, index) => {
        switch (item.model) {
          case 'tracker.speedrun':
            return <SpeedrunItem key={index} data={item.fields} />

          case 'tracker.ad':
            return <AdItem key={index} data={item.fields} />

          case 'tracker.interview':
            return <InterviewItem key={index} data={item.fields} />

          default:
            return null;
        }
      })}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  height: 400px;
  flex-direction: column;
  overflow-y: auto;
`;

const RundownItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.5rem;
  background-color: #ccc;
  color: #000;

  & + & {
    border-top: 2px solid #333;
  }
`;

const RundownRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  & > div:last-child {
    text-align: right;
  }
`;

const RundownTitle = styled(RundownRow)`
  font-size: 1.25rem;
`

const InterstitialItemContainer = styled(RundownItem)`
  background-color: #e27575;
`;