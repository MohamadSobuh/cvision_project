# User Flow Architecture & Implementation Guide (Updated)

This document outlines the structural plan and technical approach for implementing all **7 user pages**, encompassing the primary CV analysis flow and the newly added Task Learning flow.

---

## 1. Overview of the User Journey

The proposed architecture handles two interconnected sequences:

**Flow A: The Onboarding & Analysis**
1. **User Dashboard:** The entry point showing upload statistics, learning progress, and a CTA to upload a CV.
2. **CV Upload:** A drag-and-drop modal interface to upload a resume and select a target career field.
3. **Analysis Report:** A summary displaying strengths, weaknesses, and a percentage score from the CV parsing engine.
4. **Placement Test:** A multi-question interaction flow to gauge the user's current knowledge.
5. **Development Plan:** A customized grid of recommended study topics/tasks based on the user's placement test performance.

**Flow B: The Learning Loop (New)**
6. **Task Content (Lesson):** Accessed when clicking "Go" on a topic from the Development Plan. Displays the lesson text alongside supporting image and video media placeholders. It features a `< Back to Plan` link and a `Go to Quiz` button.
7. **Task Quiz:** Accessed immediately after reading the Task Content. Tests the user specifically on that task's material, featuring a similar UI to the Placement Test.

---

## 2. Recommended Folder Structure

We suggest organizing the user-facing UI in isolation to keep `admin` logic completely separate. Create the following files within your existing `src` structure:

```text
src/
 ┣ components/
 ┃ ┣ ui/
 ┃ ┃ ┣ FileUploadZone.jsx    (Drag & drop area for CV upload)
 ┃ ┃ ┣ CircularScore.jsx     (Circle progress for CV score graph)
 ┃ ┃ ┣ TopicCard.jsx         (For the development plan topics list)
 ┃ ┃ ┗ MediaBox.jsx          (Helper component for Image/Video placeholders)
 ┃ ┗ user/
 ┃   ┗ SidebarUser.jsx       (The dark left sidebar specifically for user pages)
 ┃
 ┣ pages/
 ┃ ┗ user/
 ┃   ┣ UserDashboard.jsx     (Welcome back, Cards, Call to action upload)
 ┃   ┣ UploadCV.jsx          (Start analysis, drop zone, field select)
 ┃   ┣ AnalysisReport.jsx    (Strengths, weaknesses, overall score)
 ┃   ┣ PlacementTest.jsx     (Initial overall skills quiz)
 ┃   ┣ Plan.jsx              (Proposed development plan)
 ┃   ┣ TaskContent.jsx       (Lesson text, media boxes, back/quiz navigation)
 ┃   ┣ TaskQuiz.jsx          (Task-specific quiz questions)
 ┃   ┗ UserPages.module.css  (Modular CSS managing styling for these pages)
 ┃
 ┣ context/
 ┃ ┗ UserFlowContext.jsx     (React Context Provider managing flow status)
```

---

## 3. State Management (React Context)

To cleanly pass data between sequential pages, we update the **React Context API** to also handle the `currentTask` the user is viewing.

### Code Strategy: [UserFlowContext.jsx](file:///c:/Users/ahmad/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/testComponents%20copmpostions/frontend/frontend/src/context/UserFlowContext.jsx)

```jsx
import { createContext, useState, useContext } from 'react';

const UserFlowContext = createContext();

export const UserFlowProvider = ({ children }) => {
  // 1. Upload & Analysis
  const [uploadedCV, setUploadedCV] = useState(null);
  const [targetField, setTargetField] = useState('');
  const [analysisResult, setAnalysisResult] = useState({ strengths: [], weaknesses: [], score: 0 });

  // 2. Initial Placement Test
  const [placementScore, setPlacementScore] = useState(0);

  // 3. Proposed Plan state (Topics grid)
  const [proposedPlan, setProposedPlan] = useState([]);

  // 4. Current Task state (For the Learning Loop)
  const [currentTask, setCurrentTask] = useState(null); // Stores the object of the task being viewed
  const [taskQuizScore, setTaskQuizScore] = useState(0);

  return (
    <UserFlowContext.Provider value={{
      uploadedCV, setUploadedCV,
      targetField, setTargetField,
      analysisResult, setAnalysisResult,
      placementScore, setPlacementScore,
      proposedPlan, setProposedPlan,
      currentTask, setCurrentTask,
      taskQuizScore, setTaskQuizScore
    }}>
      {children}
    </UserFlowContext.Provider>
  );
};

// Custom Hook
export const useUserFlow = () => useContext(UserFlowContext);
```

---

## 4. Routing Strategy ([App.jsx](file:///c:/Users/ahmad/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/testComponents%20copmpostions/frontend/frontend/src/App.jsx))

Update the inner `<Route>` definitions to incorporate the dynamic Task pages. You can use URL path parameters (like `/:taskId`) so the pages know which task to load.

```jsx
import { UserFlowProvider } from './context/UserFlowContext';
// ... other page imports

<Route path='/user' element={<UserLayout language={language} setLanguage={setLanguage} />}>
  
  {/* The Context Wrapper isolating User Flow */}
  <Route element={<UserFlowProvider />}>
    <Route path='dashboard' element={<UserDashboard />} />
    <Route path='upload-cv' element={<UploadCV />} />
    <Route path='analysis-report' element={<AnalysisReport />} />
    <Route path='placement-test' element={<PlacementTest />} />
    <Route path='plan' element={<Plan />} />
    
    {/* Dynamic routing for specific tasks */}
    <Route path='task/:taskId/content' element={<TaskContent />} />
    <Route path='task/:taskId/quiz' element={<TaskQuiz />} />
  </Route>
  
  <Route path='profile' element={...} />
</Route>
```

---

## 5. Implementation Sequence for the New Pages

### Phase 1: Task Content Page (`TaskContent.jsx`)
- **Layout Construction**: Build a container `.taskLessonCard` extending from your CSS module.
- **Header Section**: Use a dark blue `#124151` header block containing the book icon and `Lesson XX: Task Name`.
- **Media Row**: Create a Flexbox row with `gap: 20px` holding two dotted-border rectangles for the Image and Video placeholders.
- **Footer Navigation**: Add a standard `<Link>` pushing to `/user/plan` for the `< Back to Plan` text, and a dark primary button triggering `useNavigate('/user/task/1/quiz')` for the "Go to Quiz" action.

### Phase 2: Task Quiz Page (`TaskQuiz.jsx`)
- **Component Reusability**: This interface is 95% identical to [PlacementTest.jsx](file:///c:/Users/ahmad/OneDrive/%D8%B3%D8%B7%D8%AD%20%D8%A7%D9%84%D9%85%D9%83%D8%AA%D8%A8/testComponents%20copmpostions/frontend/frontend/src/pages/user/PlacementTest.jsx). You can actually duplicate `PlacementTest`, rename the title to "Task #1 Quiz :", and pull a different set of questions specific to `currentTask` from Context instead of the global placement ones.
- **Completion Navigation**: Upon finishing the Task Quiz, display a success message and then navigate the user back to `/user/plan` so they can see their updated progress bar for that topic constraint.
