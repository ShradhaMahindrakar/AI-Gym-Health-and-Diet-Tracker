// Shared TypeScript types for AI Gym Tracker

export type Goal =
  | 'Weight Loss'
  | 'Muscle Gain'
  | 'Endurance'
  | 'Flexibility'
  | 'General Fitness';

export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type DietaryPref =
  | 'No Preference'
  | 'Vegetarian'
  | 'Vegan'
  | 'Keto'
  | 'Paleo';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  workoutContent?: string;
  dietContent?: string;
  quiz?: QuizQuestion[];
  isCompleted: boolean;
  quizScore?: number;
}

export interface Plan {
  id: string;
  name: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  daysPerWeek: number;
  dietaryPref: DietaryPref;
  description: string;
  sessions: Session[];
  createdAt: number;
}

export type AppView = 'landing' | 'dashboard' | 'plan';

export type ContentTab = 'workout' | 'diet' | 'quiz';
