import AiCaptureDialog from "./AiCaptureDialog";

export default function AiFoodCaptureModal(props) {
  return <AiCaptureDialog {...props} targetDomain={"FOOD"}
    initialContext={props.initialMeal ? `Meal: ${props.initialMeal}` : ""}
    title="Log food with AI"
    description="A description or meal photo is enough to get started."
    placeholder="Lunch: 2 rotis, dal, mixed vegetables and a small bowl of curd."
    label="What did you eat?"
    imageLabel="Add a meal photo"
    dated={true} />;
}
