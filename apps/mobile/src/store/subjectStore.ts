import { create } from 'zustand';
import { SubjectKey } from '../theme/subjects';

/**
 * Which subject the student is currently inside. Set when they pick a subject in
 * Practice and carried down into the concept screen and the session, so screens
 * further along the flow can tint themselves without threading a route param
 * through every navigate call.
 *
 * `null` means "not scoped to one subject" — mixed practice — which renders in
 * the brand blue.
 */
interface SubjectState {
  subject: SubjectKey | null;
  setSubject: (subject: SubjectKey | null) => void;
}

export const useSubjectStore = create<SubjectState>((set) => ({
  subject: null,
  setSubject: (subject) => set({ subject }),
}));
