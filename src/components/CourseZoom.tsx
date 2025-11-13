import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CourseZoomProps {
  courseId: string;
}

const CourseZoom = ({ courseId }: CourseZoomProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zoom</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Contenido de Zoom para el curso</p>
      </CardContent>
    </Card>
  );
};

export default CourseZoom;
