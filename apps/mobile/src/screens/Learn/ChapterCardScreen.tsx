import React from 'react';

import PlaceholderScreen from '../../components/ui/PlaceholderScreen';
import { DEFAULT_TINT } from '../../theme/subjects';

// This screen used to render a chapter hub out of entirely invented content — a
// chapter called "NLM" with 147 hours of lectures, a 4.7 rating and 78% average
// retention, none of it wired to anything. It sits between UnitCard and
// LecturesList, both of which are honest placeholders, so a mock hub in the
// middle made the Learn stack read as partly working rather than unbuilt. The
// old markup is in git if the layout is wanted back once there is data.

export default function ChapterCardScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Learn"
      title="Chapter"
      blurb="Everything in one chapter: the lectures, the question sets and the practice test."
      tint={DEFAULT_TINT}
      planned={[
        'Lectures — full length and one-shots',
        'Question sets by exam and difficulty',
        'The chapter practice test',
        'Your coverage, mastery and watch time across all of it',
      ]}
    />
  );
}
