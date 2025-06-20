
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { setBrandingConfig } from "@/lib/data";
import Image from "next/image";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

const brandingFormSchema = z.object({
  logoUrl: z.string().optional(),
  logoUpload: z.instanceof(FileList).optional()
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Max logo size is 2MB.`)
    .refine(files => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type), "Only .jpg, .png, .webp, and .svg formats are supported."),
  logoHeight: z.coerce.number().min(10, "Height must be at least 10px.").max(200, "Height must be at most 200px."),
  logoWidth: z.coerce.number().min(10, "Width must be at least 10px.").max(400, "Width must be at most 400px."),
});

type BrandingFormValues = z.infer<typeof brandingFormSchema>;

export function BrandingSettingsForm() {
  const { brandingConfig, refreshUserAndLibraries } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(brandingConfig?.logoUrl || null);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      logoUrl: brandingConfig?.logoUrl || "",
      logoHeight: brandingConfig?.logoHeight || 40,
      logoWidth: brandingConfig?.logoWidth || 150,
      logoUpload: undefined,
    },
  });

  const watchedLogoUpload = form.watch('logoUpload');

  useEffect(() => {
    if (watchedLogoUpload && watchedLogoUpload.length > 0) {
      const file = watchedLogoUpload[0];
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (brandingConfig?.logoUrl) {
      setPreview(brandingConfig.logoUrl);
    } else {
      setPreview(null);
    }
  }, [watchedLogoUpload, brandingConfig?.logoUrl]);
  
  useEffect(() => {
    form.reset({
      logoUrl: brandingConfig?.logoUrl || "",
      logoHeight: brandingConfig?.logoHeight || 40,
      logoWidth: brandingConfig?.logoWidth || 150,
      logoUpload: undefined,
    });
    setPreview(brandingConfig?.logoUrl || null);
  }, [brandingConfig, form]);


  const handleSubmit = async (values: BrandingFormValues) => {
    setIsSubmitting(true);
    try {
      const { logoUpload, logoUrl, logoHeight, logoWidth } = values;
      
      const configToSet = {
        logo: logoUpload && logoUpload.length > 0 ? logoUpload[0] : logoUrl,
        height: logoHeight,
        width: logoWidth,
      };

      await setBrandingConfig(configToSet);
      await refreshUserAndLibraries();
      
      toast({
        title: "Success",
        description: "Branding settings have been updated.",
      });

    } catch (error) {
       toast({
        title: "Error",
        description: (error as Error).message || "Failed to save branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Branding Settings</CardTitle>
        <FormDescription>Customize the application's logo.</FormDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <div className="flex items-end gap-6">
                {preview && (
                    <div className="p-4 border rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground mb-2">Logo Preview</p>
                        <Image src={preview} alt="Logo preview" width={form.getValues('logoWidth')} height={form.getValues('logoHeight')} style={{ height: `${form.getValues('logoHeight')}px`, width: `${form.getValues('logoWidth')}px` }} className="object-contain" />
                    </div>
                )}
                <FormField
                    control={form.control}
                    name="logoUpload"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel>Upload New Logo</FormLabel>
                            <FormControl>
                                <Input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={(e) => field.onChange(e.target.files)} />
                            </FormControl>
                             <FormDescription>Replaces the current logo. Max 2MB.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="logoWidth"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo Width (px)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="logoHeight"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo Height (px)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Save Branding
                </Button>
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
