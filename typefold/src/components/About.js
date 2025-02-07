import { Link } from "react-router-dom";
import "../styles/TypeFold.css";

export default function About() {
  //style the about page

  return (
    <>
      <div className="aboutContainer">
        <div className="header">
        <Link to="/" className="title">
          TypoFold
        </Link>
        <Link to="/" className="aboutButton">
          Go Back
        </Link>
        </div>
        <div className="row">
          {/* Vimeo 비디오 */}
          <div
            style={{
              width: "50%",
              height: "fit-content",
              objectFit: "contain",
            }}
          >
            <div
              style={{
                padding: "56.25% 0 0 0",
                position: "relative",
                backgroundColor: "white",
              }}
            >
              <iframe
                src="https://player.vimeo.com/video/1031770589?autoplay=1&loop=1&title=0&background=1"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
                title="TypoFold"
              ></iframe>
            </div>
          </div>
          <img
            src="./cute.png"
            alt="group"
            className="projectImage"
            style={{
              width: "42%",
              height: "fit-content",
              objectFit: "contain",
            }}
          />
        </div>
        <div className="projectInfo">
          <span className="projectTitle">About Project</span>

          <p className="projectDescription">
            {"<"}TypoFold{">"} was designed to connect digital typography and
            analog sculpture. The idea is to apply texture images created using
            p5.js in a digital environment to a 3D typography model, and then
            convert it into a paper blueprint to create a physical sculpture
            that can be assembled in the real world. This is important because
            it means that digital creations don't just stay on the screen, but
            can actually be manifested in a form that can be touched and
            assembled by hand. As a result of the project, users will be able to
            print out textures and 3D typography directly from the web and
            assemble them on paper, creating the same three-dimensional artwork
            as their digital counterparts.
          </p>
        </div>
        <div className="projectInfo">
          <span className="projectTitle">
            What inspired you to create your work?
          </span>

          <p className="projectDescription">
            I was motivated by the fact that code-based design tools like p5.js
            are not being applied to the design field outside of media arts. I
            was trying to turn my previous work in p5.js into 3D merchandise,
            and it was very difficult. Programs like Adobe's Illustrator make it
            easy to create designs, but p5. js only allows you to capture
            screenshots, so it took a lot of effort to convert them into
            schematics.
            <br />
            <br />
            So I thought, “It would be great if there was a website where you
            could put a 3D object on the website and it would automatically
            create a schematic for you.” I wanted to connect it with p5.js so
            that you could create a 3D schematic of a graphic that changes in
            real time.
            <br />
            <br />
            For example, if you create an 'A' with typography, it will give you
            the shape, add faces to it, make it 3D, and convert it into a fold.
            The main reason I created {"<"}TypoFold
            {">"}was because I thought it would be easy to use. I hope that
            people who see this project will be able to use it and have fun in
            the process.
          </p>
        </div>
        <img src="./group.png" alt="group" className="projectImage" />
      </div>
    </>
  );
}
