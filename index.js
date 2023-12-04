const fileUploadForm = document.querySelector("#fileUploadForm")
const fileInput = document.querySelector("#fileInput")

fileUploadForm.addEventListener("submit", async event =>{
    
    event.preventDefault()
    const file = fileInput.files[0]
    const fileName = file.name.replaceAll(" ","_").replaceAll("%","pct").replaceAll("&","and").toLowerCase()

    //get secure url from our server
    
    const {url} = await fetch(`/s3Url?fileName=${fileName}`).then(res=>res.json())
    console.log(url)

    //Post file directly to s3 bucket
    await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "multipart/form-data"
        },
        body: file
    })

    const fileURL = url.split('?')[0]
    console.log(fileURL)

    })