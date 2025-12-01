import { InteractionForm } from "../crm/InteractionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InteractionFormExample() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Добавить взаимодействие</CardTitle>
      </CardHeader>
      <CardContent>
        <InteractionForm
          onSubmit={(data) => console.log("Interaction submitted:", data)}
          onCancel={() => console.log("Cancelled")}
        />
      </CardContent>
    </Card>
  );
}
