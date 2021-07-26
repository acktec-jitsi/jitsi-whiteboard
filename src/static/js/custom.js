    //jQuery(function(){
      //  $(document).ready(function(){
           localStorage.setItem('isModerator',false);
            var mroom = window.location.pathname.split("/")[2];
            window.addEventListener('message',event => {
                var data = event.data;
                //alert()
                console.log(data.method);
                if(data.method == "collab") {
                 //   alert('here');
                 var id = data.room.split('-');
                 var mroomid = mroom.split('-');
                 console.log(mroomid[1] +"->> "+id[1]);
                    
                    if(mroomid[1] == id[1]){
                        if(data.board === true) {
                            $('#MainToolBox').show()
                        } else {
                           // if( localStorage.getItem('isModerator') == false) {
                                $('#MainToolBox').hide()
                            //}
                           
                        }   
                       
                    }
                } else if(data.method ==="showButton"){
                    $("#whiteboardtool").show();
                    $("#clearImage").show();
                } else if(data.method ==="Role"){
                    if(data.isModerator == true) {
                        localStorage.setItem('isModerator',true);
                    }
                   
                }
                //console.log(data);
            });
        //}) 
  