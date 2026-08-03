import pandas as pd

def filter_excel_brands(input_file, output_file, sheet_name=0):
    # Load the Excel mastersheet
    # sheet_name=0 reads the first sheet, or you can specify the sheet name as a string
    df = pd.read_excel(input_file, sheet_name=sheet_name)
    
    # Assuming your brand column is named 'Brand' (change if it has a different name)
    brand_col = 'Brand'
    
    # Count how many total rows exist for each unique brand using vectorized operations
    brand_counts = df[brand_col].map(df[brand_col].value_counts())
    
    # Keep only the rows where the brand appears MORE than 1 time
    filtered_df = df[brand_counts > 1]
    
    # Save the cleaned mastersheet to a new Excel file
    filtered_df.to_excel(output_file, index=False)
        
    print(f"Original rows: {len(df)}")
    print(f"Remaining rows: {len(filtered_df)}")
    print(f"Cleaned file saved to: {output_file}")

if __name__ == "__main__":
    # Replace 'mastersheet.xlsx' with your actual file name
    filter_excel_brands("catalog.xlsx", "cleaned_mastersheet.xlsx")