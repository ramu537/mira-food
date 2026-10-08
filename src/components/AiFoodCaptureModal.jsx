import AiCaptureDialog from "./AiCaptureDialog";

export default function AiFoodCaptureModal(props) {
  return <AiCaptureDialog {...props} targetDomain={"FOOD"}
    initialContext={props.initialMeal ? `Meal: ${props.initialMeal}` : ""}
    title="Log food with AI"
    description="Describe it or add a photo. Nutrition is estimated and you can correct it any time."
    placeholder="2 rotis, dal, vegetables and a bowl of curd at 1:30 pm."
    label="What did you eat?"
    imageLabel="Add a food photo"
    dated={true} />;
}
